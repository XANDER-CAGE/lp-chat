export function formatMessage(dto: {
  firstname: string;
  lastname: string;
  topic: string;
  message: string;
}): string {
  const base = `From: *${dto.firstname} ${dto.lastname}*\nTopic: _${dto.topic}_`;
  if (!dto.message) return base;
  dto.message = escapeSpecialChars(dto.message);
  return dto.message ? base + `\nMessage: ${dto.message}` : base;
}

function escapeSpecialChars(input: string): string {
  const specialChars = [
    '*',
    '[',
    ']',
    '(',
    ')',
    '~',
    '`',
    '>',
    '#',
    '+',
    '-',
    '=',
    '|',
    '{',
    '}',
    '.',
    '!',
  ];
  const regex = new RegExp(`([\\${specialChars.join('\\')}])`, 'g');
  return input.replace(regex, '\\$1');
}
