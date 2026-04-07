type MessageHandler = (content: string) => void;

interface MessageApiLike {
  success: MessageHandler;
  error: MessageHandler;
}

let messageApi: MessageApiLike | null = null;

export function setAppMessageApi(nextMessageApi: MessageApiLike) {
  messageApi = nextMessageApi;
}

export function showAppMessageSuccess(content: string) {
  if (messageApi) {
    messageApi.success(content);
    return;
  }

  console.info(content);
}

export function showAppMessageError(content: string) {
  if (messageApi) {
    messageApi.error(content);
    return;
  }

  console.error(content);
}
