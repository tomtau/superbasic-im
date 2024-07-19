import vcards from 'vcards-js';
import {
  client,
  waContactToName,
  sendWAMessage,
  getUserContacts,
  longNumToDate,
  pairQr,
} from './client';
import {ReqRefDefaults, Request, ResponseToolkit} from '@hapi/hapi';
import fs from 'fs';
import * as emoji from 'node-emoji';
import {WAState} from 'whatsapp-web.js';
import {removeDiacritics} from './helper';

export const vcard_handler = async (
  request: Request<ReqRefDefaults>,
  h: ResponseToolkit<ReqRefDefaults>
) => {
  const vcard = vcards();
  const contact = await client.getContactById(request.params.chat_id);
  const name = waContactToName(contact, false);
  const split = name.split(' ', 2);
  vcard.firstName = split[0];
  if (split.length > 1) {
    vcard.lastName = split[1];
  }
  const phone = contact.number;
  vcard.cellPhone = '+' + phone;
  // some phones have issues with diacritics in filenames
  const filename = removeDiacritics(vcard.firstName + '_' + vcard.lastName);
  return h
    .response(vcard.getFormattedString())
    .header('Content-Type', 'text/vcard; name="' + filename + '.vcf"')
    .header('Content-Disposition', 'inline; filename="' + filename + '.vcf"');
};

export const reply_handler = async (
  request: Request<ReqRefDefaults>,
  h: ResponseToolkit<ReqRefDefaults>
) => {
  // TODO: give proper types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = request.payload as any;
  await sendWAMessage(request.params.chat_id, payload.message, payload.file);

  return h.redirect('/chats/' + request.params.chat_id);
};

export const new_chat_post_handler = async (
  request: Request<ReqRefDefaults>,
  h: ResponseToolkit<ReqRefDefaults>
) => {
  // TODO: give proper types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = request.payload as any;
  let to = payload.user;
  if (to === 'custom') {
    const number = payload.custom;
    const contact = await client.getNumberId(number);
    if (contact === null) {
      console.log('invalid number: ' + number);
      return h.redirect('/');
    } else {
      to = contact._serialized;
    }
  }
  await sendWAMessage(to, payload.message, payload.file);

  return h.redirect('/chats/' + to);
};

export const chats_handler = async (
  _request: Request<ReqRefDefaults>,
  h: ResponseToolkit<ReqRefDefaults>
) => {
  let chats = await client.getChats();
  // TODO: give proper types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chats_txt: any[] = [];
  chats = chats.sort((a, b) => {
    const aa = a.timestamp;
    const bb = b.timestamp;
    return bb - aa;
  });

  for (let i = 0; i < chats.length; i++) {
    const chat = chats[i];
    const contact = await chat.getContact();
    let name = waContactToName(contact, true);
    name =
      name +
      ' (' +
      chat.unreadCount +
      ' unread, ' +
      longNumToDate(chat.timestamp) +
      ')';
    const chat_obj = {
      name: name,
      hasUnread: chat.unreadCount > 0,
      id: encodeURIComponent(chat.id._serialized),
    };
    chats_txt.push(chat_obj);
  }
  return h.view('index', {chats: chats_txt});
};

export const contacts_handler = async (
  _request: Request<ReqRefDefaults>,
  h: ResponseToolkit<ReqRefDefaults>
) => {
  const users = await getUserContacts();
  return h.view('contacts', {users: users});
};

export const media_handler = async (
  request: Request<ReqRefDefaults>,
  h: ResponseToolkit<ReqRefDefaults>
) => {
  const id = encodeURIComponent(request.params.media_id);
  try {
    if (fs.readdirSync('media').includes(id)) {
      const path = fs.readlinkSync('media/' + id);
      return h.file(path);
    } else {
      return h.response('File not found').code(404);
    }
  } catch (err) {
    console.log(err);
    return h.response('File not found').code(404);
  }
};

export const chat_handler = async (
  request: Request<ReqRefDefaults>,
  h: ResponseToolkit<ReqRefDefaults>
) => {
  const chat = await client.getChatById(request.params.chat_id);
  const messages = await chat.fetchMessages({limit: 10});
  const fmtMsg: {
    from: string;
    msg: string[];
    time: string;
    fromMe: boolean;
    media: boolean;
    id: string;
  }[] = [];
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const msg = message.body.split('\n');
    const fromMe = message.fromMe;
    const nameId = message.author || message.from;

    const time = message.timestamp;

    const contact = await client.getContactById(nameId);
    const name = waContactToName(contact, false);
    fmtMsg.push({
      from: name,
      msg: msg.map(m => emoji.unemojify(m)),
      time: longNumToDate(time),
      fromMe: fromMe,
      media: message.hasMedia,
      id: encodeURIComponent(message.id._serialized),
    });
  }
  if (fmtMsg.length === 0) {
    fmtMsg.push({
      from: 'No messages',
      msg: [],
      time: '',
      fromMe: false,
      media: false,
      id: '',
    });
  }
  return h.view('chats', {
    messages: fmtMsg,
    chat_id: request.params.chat_id,
  });
};

export const new_chat_or_pair_handler = async (
  _request: Request<ReqRefDefaults>,
  h: ResponseToolkit<ReqRefDefaults>
) => {
  const state = await client.getState();
  if (state !== WAState.CONNECTED) {
    console.log('state: ' + state);
    return h.view('pair', {qr: pairQr});
  } else {
    const users = await getUserContacts();

    return h.view('new', {users: users});
  }
};
