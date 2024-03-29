import { brotliDecompressSync } from 'zlib'

let hook

export const getContent = () => {
  if (typeof hook === `undefined`)
    hook = brotliDecompressSync(
      Buffer.from(
        'G7gCYIzDdGMvlzqL2h6zYlupgu+h0w9r5t0/qiaIQp9Vp+YBofuyn1I6ZTwWSheJyJPFd2tPB6tLdN3vuU0wKNBQ9qCSL0qyu0wLVKJ1Gorz70w4+oxwJJM3Js9y1Tlx2DH5t9H+eLjeLlfXjG/bYYfRejxc9x8h6tfnJvwFH4TPnBCFg2HGhkBALDyOeCOn9QX4ZLW7ED+4sRTlfLQ6Qem/WQs5P8cDpD6N02qQLKDnqBI/SkOSoGUGEe8fE2viIy9+v4TXCc8Rrt9n3V085/eu0wi+7wtS0HOJTO4iyAeGgIaQYPaWcqoYfoJCcEv7PmnMImGiWnw76hWEHEgxjv0WHvBICAnwjgFVJyB2c64h0YY4',
        'base64'
      )
    ).toString()

  return hook
}
