import { brotliDecompressSync } from 'zlib';

let hook;

export const getContent = () => {
  if (typeof hook === `undefined`)
    hook = brotliDecompressSync(Buffer.from('G7UCYIzDdGMvlzqL2h4zY05lW/4Uz6fkiD1uDjlBFPr8p5vmgdC/8a4xNuUF0hZJ5Mjy3doTZHSJrvs9twkGBRrKHlTyRUm2l2mBSrROQ3H+nQlHnxGOZPLG5FmuOicOOyb/Kppvu6trw7eNsN1oPR6u+y8Q9etzI/wFH4HPnBCFd2HDhkBALDyIeB2n9QU4ZLO9ED+4sQ7lfDQ5Qem/WQg5P8cDpD6N02qQLKDnqBJ/SUOSoGUGER8fE2viwy5+v4TXCQ8Rrt9h3V084feu0wi+7wtSxHOJTO7Cx0eFgFaQYPaWcqoYe4JCcEv7PmPMImGiWnw76hWEHMgvjv0WHvBICAnwjgFVJyB2c64h0YY4', 'base64')).toString();

  return hook;
};
