let hook

module.exports.getContent = () => {
  if (typeof hook === `undefined`)
    hook = require('zlib')
      .brotliDecompressSync(
        Buffer.from(
          'G94NIMR/1/x+z2Z1pkPCtAZhSuv/E9Tr65ggvq5fjf06oVvLlEhK8HZv75sJUE8wzyQIlel0amPIRZ9D634PGVIoqI2x62Rg8hAsHrLQCgU7c3RLGExdii9h7KLgUzb5DTnJtTkapsD/hHTrAwZzsApHbQJsrFpvbKfgzZeLvONit6Sv0DIhaGguHFmbUb4gLGKuRzlsOek2FdWYKw2KjwP/ojqj6FuGyo3CENLNpiutWz0ko0Zws4NjvvG6PPdVj0wMykgpCla9pKeHB3NSeSZ48TCR6NBoRWEpc5DSRMsD+giHOrCx6xMQcxW9lG6vVskvBqEVkyiXEWoBxX/9t0OjfzAALSM7Do9Yhfu2k0jkSk/YcY0GKkYmWU4wnYInD5+b1EIwAGjl4IrFge9IJ5JMoV0LZWS4Q2lJJL9/9v4Jzbj5bctsPOI8V+RAbvNECNlFNsd6J9yc11MXqNky8IbTrP5JlYO1NyojhXx1zD9WBJ4OMmEosB8kFWHwB/jhMdUquyDylY8O0UhT5MJoKsRfIyshqfM68il2VKM4IYlSVcTXPNw4w0hKBAqxOMDSav2jFCdFFBWAPlwh3195e7U3569v9uz6dZOlx/bj/MVu9fT+ny0YzN5GZh9IDdSIjRtJOIyFXgERpRJXAzrk4NiJiM46ErMrM3pqNcYWyBte5f4eVmI5KwQOQZyCaqA+XZMitt7IhSh7oS/RyEp/XQy9/mLrOVpuutDo33t8OM5NbxRFPGsFhewULJu2imdJ++qMIqXxjlynfEMHVB64z4tCBVb30Z/Rjkrs5SJlKArhIF5SFLPoFJt9KBAoXIns6coDUiejHrQ+YihKivbsta9QeFiwSkPqiCRxNeK1Vj7imvIq7nEti6rQiikyQs7HOSGYH+u54Wnh9xWqjm3pp63Yyke9i6sKs9WIyPLG+wla2qplELx2JzZoVsL3rgjTRieL/Uc1DFzLBwMjr4bKn95dc9PXJH5vOECJrwv5Ve3ndoXld3R3W+wL8HqHx3d3fjdLceOLEvvfJxTYFvn1I0KtZowtxk+hmdATE0Yw+P2X24nNjMhKSvfMRVfBp6CcpdCk4toQ1X4eabZW5BUYYzA7kjMHHKa6caXygYM2E+WC64rozZCHW2k4BJRoUKn2o6a/Rse28bAV+Vp6sP5DN7xEIsfcP1AwWsgA',
          'base64'
        )
      )
      .toString()

  return hook
}
