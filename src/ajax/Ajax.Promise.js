import Q from 'q'
import agent from 'superagent'

import Header from '../meta/Meta.Header'
import Formule from '../string/String.Formule';
import Sign from './Ajax.Sign'
import Log from '../log/Log'

const DFT_MIME = "application/json";

class Promise {

    constructor({
        endpoint = '',
        key = '',
        debug = true
    }, secure = true) {
        this.secure = secure;
        const sign = new Sign(key, debug);
        this.sign = sign;
        if (endpoint) {
            this.endpoint = endpoint;
        } else {
            console.info("[JOY] The promise switch to relative api path instead of endpoint.");
            this.endpoint = '';
        }
        const repdor = (defer, ret) => {
            return (err, res) => {
                if (err) {
                    if (res && res.body) {
                        defer.reject(res.body.error);
                    } else {
                        defer.reject(err);
                    }
                } else {
                    if (ret && Array.prototype.isPrototypeOf(ret)) {
                        ret.push(res.body.data);
                        defer.resolve(ret);
                    } else {
                        defer.resolve(res.body.data);
                    }
                }
                if (debug) {
                    Log.response(err, res);
                }
            }
        };
        // Private
        this.request = (uri, params = {}, method = 'get', ret) => {
            if (debug) {
                Log.request(uri, method, params, this.sign.token());
            }
            const defer = Q.defer();
            try {
                if (secure) {
                    agent[method](uri)
                        .accept(DFT_MIME)
                        .set(Header['HTTP11']['CONTENT_TYPE'], DFT_MIME)
                        .set(Header['HTTP11']['AUTHORIZATION'], this.sign.token())
                        .send(params)
                        .end(repdor(defer, ret))
                } else {
                    agent[method](uri)
                        .accept(DFT_MIME)
                        .set(Header['HTTP11']['CONTENT_TYPE'], DFT_MIME)
                        .send(params)
                        .end(repdor(defer, ret))
                }
            } catch (error) {
                console.error(error);
            }
            return defer.promise;
        };
        const fnRequest = this.request;
        this.promise = (method) => (uri, params = {}) => {
            let api = Formule.format(uri, params);
            // 签名
            sign.signature(api, method.toUpperCase(), params);
            // 最终请求路径
            api = `${endpoint}${api}`;
            return fnRequest(api, params, method.toLowerCase());
        };
        this.buildUri = (uri, params, method = "GET") => {
            let api = Formule.format(uri, params);
            // 签名
            this
                .sign
                .signature(api, method, params);
            // 追加Query
            const query = Formule.query(params, (0 > uri.indexOf('?')
                ? 0
                : 1));
            api = api + query;
            // 最终请求路径
            api = `${this.endpoint}${api}`;
            return api;
        }
    }

    flowGet(uri, params = {}, ret) {
        const api = this.buildUri(uri, params, "GET");
        return this.request(api, params, "get", ret);
    }

    delete(uri, params = {}) {
        const api = this.buildUri(uri, params, "DELETE");
        return this.request(api, params, "delete");
    }

    get(uri, params = {}) {
        return this.flowGet(uri, params);
    }

    post(uri, params = {}) {
        const request = this.promise('post');
        return request(uri, params);
    }

    put(uri, params = {}) {
        const request = this.promise('put');
        return request(uri, params);
    }

    // 静态方法处理
    static _(store = {}) {
        const defer = Q.defer();
        defer.resolve(store);
        return defer.promise;
    }
}

export default Promise
