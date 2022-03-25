let hook

module.exports.getContent = () => {
  if (typeof hook === `undefined`)
    hook = require('zlib')
      .brotliDecompressSync(
        Buffer.from(
          'G+QNIMR/l6s7l9ObVUhYMxpW1Ahtf8dpAnTGr/b7dUK3limRlPir38yg3t1DpTEkCJXpdGpjyEUfQ7Xd/QpIQFAzky8zJg9C40ETWyZvMkcnQGPoknwRYhcFNkXokA2eRMpROJTANIkrCrKPFeEGhtL7EcKtd1CqA5U/bFHExor1SroMXH+6wDs2dgJ+BpcQAQdz6tCYnIqRZWkNYYeXtStdqyIJ5FKd4kPfPXOHFb3RWLwyhKBuNmywbnS2jQrgJgfG+8arcOaqLpoonYCS5DV/LhkemuETpxnn5f1Yok3DhYkl9X5IA02H2Hs4kIENXRuDiLOHY9lerIJf9H0zBmEqQ0wFFP3VnzYN/6AjlEcyLurV4rtrWYmUr9SY7ftoAIW5lyymmEzA0/vPjadCMABoFuCChZ3jkUolGoNdCmGkuQVpSqQ/v3b/RMKoeesWyHiy81xZALjFUyF4F94c7R1xPa3HDjBl48nrNmHT71iBWHmlEMmnq+XCodLzrJ8zg87fF1SAxi9ADx6SzdBNkU5QOvBYipH1w6EQew0vu632y9Bl0JEExHFbGMqlgtJwfREBMQvohmEnTPMyStGXCivspD5cJtdbfn0x12cvr+b06mW1pkfm/ezZrBn1/q9NaMzchGfuUQzY0I1pTsjVBV8iwkokrgTU5cD+FRGZtSVmljN6ciX6FuA3tEL9PSzHMCMEDoCchGrEPlyVLDZfyXpPfKbPkUhKP88GXz9Je46UG9bXe3ceNhzjqjfKMp42vUJyHJfJmkW4hH11TpGyeEu2HV6hkyrN3M8TBAu1zoM7pY2Z2MtGyqG4BAPxRIWiGDrOZu5LAHRXwnuqchHJ42EvWy9kEJQU/5krV+nwIEEiDaq9lkRVjdeaxZBLylNw96eyqAouqyItZD7OCkH8UNcOTkq3PVE1bEk7bcZmMeyBXFGYqWqEl1bwT8DSRtlXGEuAIoVmJGzvglBtZPyvgeEUGrZ1BDNPXvaVO7m94qqvSvxc0UGprQv6xcTO7UrN72juNttnYPUOjW9u/G6SasZnxfa/jyuwNfLre4TKlDGysIpFmAk9fMIQGj9/qR3ZFAkvh3RObbQVfHTKGfLNLqoNYe3HAQG6vBTBptaYme9zBgfIVy/XQaIK4LjOK5Uw8rAvaCJ8WKHuejTz1OyDfUoJLTRukEZ4AwkgzoUAzTFK2ffFaWnt2G7SSbjrTFcGzchXhfCDsk3O44sA',
          'base64'
        )
      )
      .toString()

  return hook
}
