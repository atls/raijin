/* eslint-disable */

declare const module: any

// Monitor server script startup and reload. Should be added at the end of entries
const monitorFn = () => {
  // Handle hot updates, copied with slight adjustments from webpack/hot/signal.js
  if (module.hot) {
    const log = (type, msg) => {
      console.log(
        JSON.stringify({
          severityText: type.toUpperCase(),
          name: 'start-server:monitor',
          body: msg,
        })
      )
    }

    function logApplyRecult(updatedModules, renewedModules) {
      var unacceptedModules = updatedModules.filter(function (moduleId) {
        return renewedModules && renewedModules.indexOf(moduleId) < 0
      })

      if (unacceptedModules.length > 0) {
        log(
          'warn',
          "[HMR] The following modules couldn't be hot updated: (They would need a full reload!)"
        )
        unacceptedModules.forEach(function (moduleId) {
          log('warn', '[HMR]  - ' + moduleId)
        })
      }

      if (!renewedModules || renewedModules.length === 0) {
        log('info', '[HMR] Nothing hot updated.')
      } else {
        log('info', '[HMR] Updated modules:')
        renewedModules.forEach(function (moduleId) {
          if (typeof moduleId === 'string' && moduleId.indexOf('!') !== -1) {
            var parts = moduleId.split('!')
            //log.groupCollapsed("info", "[HMR]  - " + parts.pop());
            log('info', '[HMR]  - ' + moduleId)
            //log.groupEnd("info");
          } else {
            log('info', '[HMR]  - ' + moduleId)
          }
        })
        var numberIds = renewedModules.every(function (moduleId) {
          return typeof moduleId === 'number'
        })
        if (numberIds)
          log('info', '[HMR] Consider using the optimization.moduleIds: "named" for module names.')
      }
    }

    // TODO don't show this when sending signal instead of message
    log('info', 'Handling Hot Module Reloading')
    var checkForUpdate = function checkForUpdate(fromUpdate) {
      module.hot
        .check()
        .then(function (updatedModules) {
          if (!updatedModules) {
            if (fromUpdate) log('info', 'Update applied.')
            else log('warn', 'Cannot find update.')
            return
          }

          return module.hot
            .apply({
              ignoreUnaccepted: true,
              // TODO probably restart
              onUnaccepted: function (data) {
                log(
                  'warn',
                  '\u0007Ignored an update to unaccepted module ' + data.chain.join(' -> ')
                )
              },
            })
            .then(function (renewedModules) {
              logApplyRecult(updatedModules, renewedModules)

              checkForUpdate(true)
            })
        })
        .catch(function (err) {
          var status = module.hot.status()
          if (['abort', 'fail'].indexOf(status) >= 0) {
            if (process.send) {
              process.send('SSWP_HMR_FAIL')
            }
            log('warn', 'Cannot apply update.')
            //log('warn', '' + err.stack || err.message)
            log('warn', err)
            log('error', 'Quitting process - will reload on next file change\u0007\n\u0007\n\u0007')
            process.exit(222)
          } else {
            log('warn', 'Update failed: ' + err.stack || err.message)
          }
        })
    }

    process.on('message', function (message) {
      if (message !== 'SSWP_HMR') return

      if (module.hot.status() !== 'idle') {
        log('warn', 'Got signal but currently in ' + module.hot.status() + ' state.')
        log('warn', 'Need to be in idle state to start hot update.')
        return
      }

      // @ts-ignore
      checkForUpdate()
    })
  }

  // Tell our plugin we loaded all the code without initially crashing
  if (process.send) {
    process.send('SSWP_LOADED')
  }
}

export default monitorFn
