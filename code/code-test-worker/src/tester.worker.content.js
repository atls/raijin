let hook

module.exports.getContent = () => {
  if (typeof hook === `undefined`)
    hook = require('zlib')
      .brotliDecompressSync(
        Buffer.from(
          'G6ENABwHdqMPWWZeF0ly7U/+u1p178vpjUPCmMGI2i5lv9oh1mINomDWN0F6fP7/w58HHkqCEf3u/GvN9I3W5qhAO56n1ollfgz9r5Ax0s6XJZOHofKwzq6S131HL2Bf56XZAsgBEozKxr+hxLl2cNAJ/mfIsD5BYw5Y8ahBOXvL1jspKnTz7UKH2wBVH5afw4vIgId94ljrgsqBYdl9wowuaU8mnYop0LUqxceeeeUJUhSJsuWWQQR3v5YG604Xy6gQbnlgnG+8Duem08YTpRJUmrxmL6kOogU6caFJZh+nQpMGKwtL75/UQt0g+xEOhWCDN0Yg6uzBWL5XO+kver4e07CYMSYcsoDN3yYN/mE/R5kk40H7D4eHTipkjGVGlWMbDbCwdJLVDOMxWPb4udGE8woA9RJMsnDwOzKZwGO4ayGNLEth2kL2+3f/H1eR8ysX6Hj5ec6WgO6wjHPmhTlHfSfcntdzD5hUhoM3U9V/YYCw8UYhki9Y/f4x61neK7hB536UVsK+v4AgPKXrYTJEugDpwCMpSt4POkNsNrrklrqvA5ODxxSM45Ywmb2+EnF9DUExD+hm4SBL8zpI0VcKL+yEPlwi0116e9U3569v+uz6dbOlJ/rj/EVv+XTg7zYyfRedfkQ5YEM2sc8KubLwa05UysQVgbodOH4iIrSuML3Up6eXo38BhiPL5N/DUgzTnOMQ2GnIRurTFcFj+41S72kv9DUWaen3xRDQb1KfI+ZW6qvdB48RJ5juDWvjWd1L5XFmLq9X0ZL41QVFyuMdpc3wDhOh0sL7vDBYafUezRntrMRhaaQCqkOwEC8uVLUwYWzuwUKgvxLmMx2Tkz4ZTEXrwwZJSfWeuzZBhYcGyTQsj0oShRKv1csBE5VXco8vqqvwki6yXPTIec6pH2un/VNr9heqYVMYajvWy8EUxjVpOpSILm7An8BltBwOQWt4Io3mBOO7wnUbGw36H0+wL239wMKR133HnN5dM93Xhd9b8lBi7IJ/VRm6HbT8jvZu830BZu8Q+e7W75YpdnxRfP/7+AJbJb++Swg8x6MLy1DBvtBzN8a+33/FndjUiC4l9c7SmAb56JVz5JtVGA5R+OPAAGFeS2C7TC/XOYdD7JuXgpC4hDit98qo6MOxnomxjoXg9WTuqVkHx4wSWmDc4FTUGCelwa/dIJMM11dO+vXIVuSdnogWNQ/tAQ==',
          'base64'
        )
      )
      .toString()

  return hook
}
