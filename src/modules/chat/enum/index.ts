export enum MessageTypeEnum {
  Text = 'text',
  Photo = 'photo',
  Video = 'video',
  VideoCall = 'video_call',
  AudioCall = 'audio_call',
  Payment = 'payment',
  Rate = 'rate',
  AcceptOperator = 'acceptOperator',
  Document = 'document',
}

export enum ConsultationStatus {
  NEW = 0,
  IN_PROGRESS = 1,
  FINISHED = 2,
}

export enum ConsultationTransactionStatus {
  NOT_PAYED = 0,
  PAYED = 1,
}
