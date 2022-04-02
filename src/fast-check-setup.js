/* eslint-disable no-empty-function, require-atomic-updates */
import { configureGlobal, readConfigureGlobal } from 'fast-check'

const previousBeforeEach = global.beforeEach
const previousAfterEach = global.afterEach

let during = false

global.beforeEach = (fn, ...args) => {
  previousBeforeEach(async () => {
    if (!during) {
      try {
        await fn()
      } finally {
        during = true
      }
    }
  }, ...args)

  const { asyncBeforeEach: previousAsyncBeforeEach = () => {} } =
    readConfigureGlobal()

  configureGlobal({
    ...readConfigureGlobal(),
    async asyncBeforeEach() {
      if (!during) {
        try {
          await previousAsyncBeforeEach()
          await fn()
        } finally {
          during = true
        }
      }
    },
  })
}

global.afterEach = (fn, ...args) => {
  previousAfterEach(async () => {
    if (during) {
      try {
        await fn()
      } finally {
        during = false
      }
    }
  }, ...args)

  const { asyncAfterEach: previousAsyncAfterEach = () => {} } =
    readConfigureGlobal()

  configureGlobal({
    ...readConfigureGlobal(),
    async asyncAfterEach() {
      if (during) {
        try {
          await previousAsyncAfterEach()
          await fn()
        } finally {
          during = false
        }
      }
    },
  })
}
