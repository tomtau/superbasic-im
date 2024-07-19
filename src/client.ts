import {
  Client as WAClient,
  LocalAuth,
  Contact as WAContact,
  MessageMedia,
} from 'whatsapp-web.js';
import fs from 'fs';
import * as QRCode from 'qrcode';
import * as mime from 'mime-types';
import * as emoji from 'node-emoji';

// Create a new client instance
export const client = new WAClient({
  authStrategy: new LocalAuth(),
});
export let pairQr: string | null = null;

// When the client is ready, run this code (only once)
client.once('ready', () => {
  console.log('Client is ready!');
});

// When the client received QR-Code
// TODO: give proper types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
client.on('qr', (qr: any) => {
  console.log('QR code RECEIVED');
  // TODO: give proper types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  QRCode.toDataURL(qr, (err: any, url: any) => {
    pairQr = url;
  });
});

client.on('message_create', async msg => {
  const id = encodeURIComponent(msg.id._serialized);

  console.log(
    'new message: ' +
      id +
      ' from ' +
      msg.author +
      ' to ' +
      msg.to +
      ' at ' +
      msg.timestamp
  );
  if (msg.hasMedia) {
    const media = await msg.downloadMedia();
    const extension = mime.extension(media.mimetype);
    await fs.writeFile(
      'media/' + id + '.' + extension,
      Buffer.from(media.data, 'base64'),
      err => {
        if (err) {
          return console.log(err);
        }
        console.log('The file was saved: ' + id);
        fs.symlinkSync('media/' + id + '.' + extension, 'media/' + id, 'file');
      }
    );
  }
});

// TODO: give a proper return type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getUserContacts(): Promise<any> {
  const users = [];
  const contacts = await client.getContacts();
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    if (contact.isUser) {
      const user = {
        name: waContactToName(contact, true),
        id: contact.id._serialized,
      };
      users.push(user);
    }
  }
  users.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });
  return users;
}

export function waContactToName(
  contact: WAContact,
  addNumber: boolean
): string {
  let name = contact.name || contact.pushname;

  if (addNumber && contact.isUser) {
    name = name + ' [' + contact.number + ']';
  }
  if (name) {
    return emoji.unemojify(name);
  } else {
    return contact.number;
  }
}

export function longNumToDate(
  noOrLong: number | null | undefined | string
): string {
  let date = new Date();
  if (typeof noOrLong === 'number') {
    date = new Date(noOrLong * 1000);
  } else if (typeof noOrLong === 'string') {
    date = new Date(parseInt(noOrLong) * 1000);
  }
  return date.toLocaleString();
}

// TODO: give a proper type to file
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendWAMessage(to: string, msg: string, file: any) {
  if (msg.length > 0) {
    await client.sendMessage(to, emoji.emojify(msg));
  }
  if (file.bytes > 0) {
    const media = MessageMedia.fromFilePath(file.path);
    media.filename = file.filename;
    media.mimetype = file.headers['content-type'];
    await client.sendMessage(to, media);
  }
}
