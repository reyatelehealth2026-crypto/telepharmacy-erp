export interface LineSource {
  type: 'user' | 'group' | 'room';
  userId?: string;
  groupId?: string;
  roomId?: string;
}

export interface LineTextMessage {
  id: string;
  type: 'text';
  text: string;
  quoteToken?: string;
}

export interface LineImageMessage {
  id: string;
  type: 'image';
  contentProvider: {
    type: 'line' | 'external';
    originalContentUrl?: string;
    previewImageUrl?: string;
  };
}

export interface LineStickerMessage {
  id: string;
  type: 'sticker';
  packageId: string;
  stickerId: string;
}

export interface LineLocationMessage {
  id: string;
  type: 'location';
  title: string;
  address: string;
  latitude: number;
  longitude: number;
}

export type LineMessage =
  | LineTextMessage
  | LineImageMessage
  | LineStickerMessage
  | LineLocationMessage
  | { id: string; type: string };

export interface LineMessageEvent {
  type: 'message';
  replyToken: string;
  timestamp: number;
  mode: 'active' | 'standby';
  source: LineSource;
  message: LineMessage;
}

export interface LineFollowEvent {
  type: 'follow';
  replyToken: string;
  timestamp: number;
  mode: 'active' | 'standby';
  source: LineSource;
}

export interface LineUnfollowEvent {
  type: 'unfollow';
  timestamp: number;
  mode: 'active' | 'standby';
  source: LineSource;
}

export interface LinePostbackEvent {
  type: 'postback';
  replyToken: string;
  timestamp: number;
  mode: 'active' | 'standby';
  source: LineSource;
  postback: {
    data: string;
    params?: {
      date?: string;
      time?: string;
      datetime?: string;
    };
  };
}

export type LineWebhookEvent =
  | LineMessageEvent
  | LineFollowEvent
  | LineUnfollowEvent
  | LinePostbackEvent;

export interface LineWebhookBody {
  destination: string;
  events: LineWebhookEvent[];
}

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  language?: string;
}

export interface LineSendMessagePayload {
  to: string;
  messages: LineMessageObject[];
}

export interface LineReplyMessagePayload {
  replyToken: string;
  messages: LineMessageObject[];
}

export type LineMessageObject =
  | LineTextMessageObject
  | LineFlexMessageObject
  | LineStickerMessageObject;

export interface LineTextMessageObject {
  type: 'text';
  text: string;
  quoteToken?: string;
}

export interface LineFlexMessageObject {
  type: 'flex';
  altText: string;
  contents: FlexContainer;
}

export interface LineStickerMessageObject {
  type: 'sticker';
  packageId: string;
  stickerId: string;
}

export type FlexContainer = FlexBubble | FlexCarousel;

export interface FlexBubble {
  type: 'bubble';
  size?: 'nano' | 'micro' | 'kilo' | 'mega' | 'giga';
  direction?: 'ltr' | 'rtl';
  header?: FlexBox;
  hero?: FlexImage | FlexBox;
  body?: FlexBox;
  footer?: FlexBox;
  styles?: Record<string, unknown>;
}

export interface FlexCarousel {
  type: 'carousel';
  contents: FlexBubble[];
}

export interface FlexBox {
  type: 'box';
  layout: 'horizontal' | 'vertical' | 'baseline';
  contents: FlexComponent[];
  flex?: number;
  spacing?: string;
  margin?: string;
  paddingAll?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingStart?: string;
  paddingEnd?: string;
  backgroundColor?: string;
  cornerRadius?: string;
  action?: FlexAction;
  [key: string]: unknown;
}

export interface FlexText {
  type: 'text';
  text: string;
  size?: string;
  weight?: 'regular' | 'bold';
  color?: string;
  wrap?: boolean;
  flex?: number;
  align?: 'start' | 'end' | 'center';
  margin?: string;
  decoration?: 'none' | 'underline' | 'line-through';
  [key: string]: unknown;
}

export interface FlexImage {
  type: 'image';
  url: string;
  size?: string;
  aspectRatio?: string;
  aspectMode?: 'cover' | 'fit';
  action?: FlexAction;
  [key: string]: unknown;
}

export interface FlexButton {
  type: 'button';
  action: FlexAction;
  style?: 'primary' | 'secondary' | 'link';
  color?: string;
  height?: 'sm' | 'md';
  margin?: string;
  [key: string]: unknown;
}

export interface FlexSeparator {
  type: 'separator';
  margin?: string;
  color?: string;
}

export interface FlexFiller {
  type: 'filler';
  flex?: number;
}

export type FlexComponent =
  | FlexBox
  | FlexText
  | FlexImage
  | FlexButton
  | FlexSeparator
  | FlexFiller;

export interface FlexUriAction {
  type: 'uri';
  label: string;
  uri: string;
}

export interface FlexPostbackAction {
  type: 'postback';
  label: string;
  data: string;
  displayText?: string;
}

export interface FlexMessageAction {
  type: 'message';
  label: string;
  text: string;
}

export type FlexAction = FlexUriAction | FlexPostbackAction | FlexMessageAction;
