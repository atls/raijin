let hook

module.exports.getContent = () => {
  if (typeof hook === `undefined`)
    hook = require('zlib')
      .brotliDecompressSync(
        Buffer.from(
          'GwMDYCwKTDf0rizmy4aYd3r4HIay5pbq88U70Lf7nKkO2YwqbHGYIAp9BTSVd05HmSRC5fecGg1rlHLjX+bqHM8LMiZ4Qeol6GO6VZ7awHDVdlpy3tyTlYsapIU19sNkuNVY9D0ODlFq2a3w5sJS7dGe9LGX2eYTW0P+Pm9D4teq2W8CJQ0577FknsI90P0chCwER1QNRB7U2GnHSUC2k7uTTvv4W+UyBEzR2c+g17/4Xnj5VtDvcErepYZqwZU1yCw+zHSJb874+XkxTljUSDRbe9ZzsDgfw39JMueLzunlTUorl/Ir8GOGQvipcVHQiJ4E2xpUd/l4zmtBrqADVY4v3RWNDuBMxudpMMKegpVw+3LAWwWwZ2ck9K1OmAE=',
          'base64'
        )
      )
      .toString()

  return hook
}
