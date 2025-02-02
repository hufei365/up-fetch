import { buildOptions } from './build-options.js'
import { ResponseError } from './response-error.js'
import { UpFetchOptions, UpOptions } from './types.js'
import { emptyOptions } from './utils.js'

export function up<
   TFetchFn extends typeof fetch,
   TUpOptions extends UpOptions<TFetchFn, any> = UpOptions<
      TFetchFn,
      ResponseError
   >,
>(fetchFn: TFetchFn, getUpOptions: () => TUpOptions = () => emptyOptions) {
   return <
      TData = Awaited<ReturnType<NonNullable<TUpOptions['parseResponse']>>>,
      TResponseError = Awaited<
         ReturnType<NonNullable<TUpOptions['parseResponseError']>>
      >,
   >(
      input: RequestInfo | URL,
      upfetchOptions:
         | UpFetchOptions<TData, TResponseError, TFetchFn>
         | ((
              upOptions: TUpOptions,
           ) => UpFetchOptions<TData, TResponseError, TFetchFn>) = emptyOptions,
   ) => {
      let upOptions = getUpOptions()
      let upfetchOpts =
         typeof upfetchOptions === 'function'
            ? upfetchOptions(upOptions)
            : upfetchOptions
      let options = buildOptions(input, upOptions, upfetchOpts)
      upfetchOpts.onBeforeFetch?.(options)
      upOptions.onBeforeFetch?.(options)

      return fetchFn(options.input, options)
         .catch((error) => {
            upfetchOpts.onRequestError?.(error, options)
            upOptions.onRequestError?.(error, options)
            throw error
         })
         .then(async (res) => {
            if (res.ok) {
               let data: Awaited<TData>
               try {
                  data = await options.parseResponse(res, options)
               } catch (error: any) {
                  upfetchOpts.onParsingError?.(error, options)
                  upOptions.onParsingError?.(error, options)
                  throw error
               }
               upfetchOpts.onSuccess?.(data, options)
               upOptions.onSuccess?.(data, options)
               return data
            } else {
               let respError: Awaited<TResponseError>
               try {
                  respError = await options.parseResponseError(res, options)
               } catch (error: any) {
                  upfetchOpts.onParsingError?.(error, options)
                  upOptions.onParsingError?.(error, options)
                  throw error
               }
               upfetchOpts.onResponseError?.(respError, options)
               upOptions.onResponseError?.(respError, options)
               throw respError
            }
         })
   }
}
