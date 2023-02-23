let hook

module.exports.getContent = () => {
  if (typeof hook === `undefined`)
    hook = require('zlib')
      .brotliDecompressSync(
        Buffer.from(
          'GwADYKwKzHNdR5Lmmgpp3k4Oz2Jh1jZTfb54D9uv77mlKqK2YdA1WYIo9BXQVL3d1ZFTJolQWXBqNKxRyo/7rN05PQUZE7wg9RLUnC4cKi6OynH5mohCkSLaa8l7MrSesVmfOTX2Syi+1Ui4x80VpWS3Qs0Fqad877rQ7FTDHJDe9xwkfq2b/EI7Uj/n4UqmEfIQ9HP9mR8cUTf7uJ8xYsdJELOTPg0fPn5VuQxVKch+R7D+uQGNdwDeIUo+pIZCkLKGWawftpDEMzN+fiv2Cc8ZCe9pz3auifPL+xdJ0aTo1FTejLSmKH//Ps4mFE+NEkELeuI5a1bdpfE80YKmpsNVXi7lCtABacn+PM1G8NSshOzLjrcNZs+OQuhTJxYB',
          'base64'
        )
      )
      .toString()

  return hook
}
