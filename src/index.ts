import Hapi, {Server} from '@hapi/hapi';
import * as path from 'path';
import * as handlebars from 'handlebars';
import * as Inert from '@hapi/inert';
import * as Vision from '@hapi/vision';
import * as Cookie from '@hapi/cookie';
import * as Crumb from '@hapi/crumb';
import * as argon2 from 'argon2';
import readline from 'readline';
import fs from 'fs';
import {randomBytes} from 'crypto';

import {WAState} from 'whatsapp-web.js';
import {client, pairQr} from './client';
import {
  chat_handler,
  new_chat_or_pair_handler,
  contacts_handler,
  media_handler,
  recent_chats_handler,
  all_chats_handler,
  new_chat_post_handler,
  reply_handler,
  vcard_handler,
  read_all_handler,
  chat_info_handler,
} from './routes';

export let server: Server;

export const init = async function (): Promise<Server> {
  const user: {
    phoneNumber: string;
    hash: string;
    cookieKey: string;
  } = JSON.parse(fs.readFileSync('user.json', 'utf8'));
  server = Hapi.server({
    port: process.env.PORT || 4000,
    host: '0.0.0.0',
    routes: {
      cors: {
        credentials: true,
      },
    },
  });
  await server.register([Inert, Vision, Cookie]);
  await server.register({
    plugin: Crumb,

    options: {},
  });

  server.auth.strategy('session', 'cookie', {
    cookie: {
      name: 'sid',
      password: user.cookieKey,
      isSecure: process.env.NODE_ENV === 'production',
    },
    redirectTo: '/login',
    // TODO: give proper types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validate: async (_request: any, session: any) => {
      return {isValid: session.id === user.phoneNumber};
    },
  });

  server.auth.default('session');

  // Add Middleware
  server.ext('onRequest', async (request, h) => {
    if (
      request.path !== '/login' &&
      request.path !== '/' &&
      !request.path.startsWith('/public')
    ) {
      const state = await client.getState();
      if (state !== WAState.CONNECTED && pairQr !== null) {
        return h.redirect('/').takeover();
      }
    }
    return h.continue;
  });
  server.views({
    engines: {
      html: handlebars,
    },
    path: path.join(__dirname, 'views'),
  });

  // Routes
  server.route({
    method: 'GET',
    path: '/public/{param*}',
    handler: {
      directory: {
        path: path.join(__dirname, 'public'),
      },
    },
    options: {
      auth: false,
    },
  });

  server.route([
    {
      method: 'GET',
      path: '/login',
      handler: function (request, h) {
        return h.view('login');
      },
      options: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/login',
      handler: async (request, h) => {
        if (typeof request.payload === 'object') {
          try {
            const {username, password} = request.payload as {
              username: string;
              password: string;
            };
            if (
              username === user.phoneNumber &&
              (await argon2.verify(user.hash, password))
            ) {
              request.cookieAuth.set({id: username});
              return h.redirect('/');
            }
          } catch (err) {
            console.error(err);
          }
        }
        return h.redirect('/login');
      },
      options: {
        auth: {
          mode: 'try',
        },
      },
    },
    {
      method: 'GET',
      path: '/chats/{chat_id}/vcard',
      handler: vcard_handler,
    },
    {
      method: 'GET',
      path: '/chats/{chat_id}/seen',
      handler: read_all_handler,
    },
    {
      method: 'POST',
      path: '/chats/{chat_id}/reply',
      options: {
        payload: {
          maxBytes: 1024 * 1024 * 5,
          multipart: {
            output: 'file',
          },
          parse: true,
        },
      },
      handler: reply_handler,
    },
    {
      method: 'POST',
      path: '/new-chat',
      options: {
        payload: {
          maxBytes: 1024 * 1024 * 5,
          multipart: {
            output: 'file',
          },
          parse: true,
        },
      },
      handler: new_chat_post_handler,
    },
    {
      method: 'GET',
      path: '/chats',
      handler: all_chats_handler,
    },
    {
      method: 'GET',
      path: '/recentchats',
      handler: recent_chats_handler,
    },
    {
      method: 'GET',
      path: '/contacts',
      handler: contacts_handler,
    },
    {
      method: 'GET',
      path: '/media/{media_id}',
      handler: media_handler,
    },
    {
      method: 'GET',
      path: '/chats/{chat_id}',
      handler: (request, h) => chat_handler(request, h, false),
    },
    {
      method: 'GET',
      path: '/chats/{chat_id}/allunreadmessages',
      handler: (request, h) => chat_handler(request, h, true),
    },
    {
      method: 'GET',
      path: '/chats/{chat_id}/info',
      handler: chat_info_handler,
    },
    {
      method: 'GET',
      path: '/',
      handler: new_chat_or_pair_handler,
    },
  ]);

  return server;
};

export const start = async function (): Promise<void> {
  console.log(`Listening on ${server.settings.host}:${server.settings.port}`);
  server.start();
};

process.on('unhandledRejection', err => {
  console.error('unhandledRejection');
  console.error(err);
});

// if args are passed, then create a user, otherwise start the server
if (process.argv.length > 2 && process.argv[2] === 'init') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter the phone number: ', async phoneNumber => {
    // TODO: give proper types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rli = rl as any;

    rli.stdoutMuted = true;
    rli.query = 'Enter the password: ';
    rl.question(rli.query, async password => {
      const hash = await argon2.hash(password.trim());
      rl.close();
      // generate 32 byte key for cookie password'
      const cookieKey = randomBytes(32).toString('base64');

      // save to a file
      const user = {phoneNumber, hash, cookieKey};
      fs.writeFileSync('user.json', JSON.stringify(user));
      console.log('\nUser created');
    });
    rli._writeToOutput = function _writeToOutput(stringToWrite: string) {
      if (rli.stdoutMuted) rli.output.write('*');
      else rli.output.write(stringToWrite);
    };
  });
} else {
  // Start your client
  client.initialize();
  init()
    .then(() => start())
    .catch(err => console.error('Error While Starting the server', err));
}
