export type GenerateMailParams = {
  recipient?: string;
  recipientAttr?: string;
  sender?: string;
  context?: string;
  situation: string;
  message: string;
  action?: string;
  casual: number;
  otherContext?: string;
};

export type GenerateMailAutoFillFormat = {
  recipientAttr: string;
  recipient: string;
  senderAttr: string;
  sender: string;
  summary: string;
  situation: string;
  message: string;
  action: string;
  other: string;
};
