(function ($) {

    function createURL(path, base = window.location.origin) {
        try {
            return new URL(path);
        } catch (err) {
            return new URL(path, base);
        }
    }

    const defaults = Object.freeze({
        name: 'otp',
        // chars: 4,
        regex: new RegExp(`^[a-zA-Z0-9]{1,1}`, 'g'),
        animation: {
            fade: 600,
            position: 600
        },
        fetch: {
            requestOTP: {
                url: 'http://localhost:3001/api/request.json',
                options: {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                },
                onRequest: function (res, err) {

                    if (err) {
                                
                        this.setErrorMessage('Unexpected Request Error');

                        return false;

                    } else {
                        // Examine further cases
                        return true;

                    }

                }
            },
            validateOTP: {
                url: 'http://localhost:3001/api/validate.json',
                options: {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                },
                onValidate: function (res, err) {

                    if (err) {

                        this.setErrorMessage('Unexpected Validation Error');

                        return false;

                    } else if (res.result !== true) {

                        this.setErrorMessage('Invalid token provided');

                        return false;

                    } else {

                        return true;

                    }

                }
            }
        },
        i18n: {
            title: 'Login',
            subtitle: 'Please enter the one-time password<br/>that has been sent to you.',
            label: 'One-time password',
            resend: 'Click here to resend the code.',
            validate: 'CONTINUE',
            cancel: 'CLOSE',
            retry: 'RETRY',
            expired: 'The code sent has expired.',
            invalid: 'Unexpected error.'
        },
        events: {
            // onCancelClick: function (evt, instance) {

            //     evt.preventDefault();

            //     instance.hide();

            // }
        }
    });

    $.fn.OTP = function (options = {}) {

        options = $.extend(true, {}, defaults, options);

        const instance = {};
        const { name, regex, i18n, animation, events } = options;
        const { title, subtitle, label, expired, invalid, resend, cancel, validate, retry } = i18n;

        const onSubmit = function (evt) {

            evt.preventDefault();
            evt.stopImmediatePropagation();

            instance.show();

        }

        const generateInputChars = (len = options.chars) => {

            const arr = [];

            for (let i = 0; i < len; i++) {
                arr.push(`<input class="otp-char otp-char-${i}" type="text" maxlength="1" autocorrect="off" autocomplete="off" />`);
            }

            return arr.join('\n');

        }

        const attachCharEventListeners = () => {

            const charArr = [];

            instance.$chars.on('keydown', function (evt) {

                switch (evt.key.toLowerCase()) {

                    case 'tab': {

                        evt.preventDefault();
                        evt.stopImmediatePropagation();

                        const $next = $(this).next('.otp-char');

                        if ($next.length) {
                            $next.focus();
                            $next.get(0).setSelectionRange(0, 0);
                        }

                        break;

                    }

                }

            });

            instance.$chars.on('keypress', function (evt) {

                if (evt.key.match(regex) === null) {
                    evt.preventDefault();
                    evt.stopImmediatePropagation();
                } else {

                    const { selectionStart, selectionEnd } = this;

                    if ((selectionStart === 0) && (selectionEnd === 0)) {
                        $(this).val('');
                    }

                }

            });

            instance.$chars.on('input', function (evt) {

                const $this = $(this);
                const index = $this.index();
                const value = $this.val();

                if (value.length) {

                    charArr[index] = value;

                    instance.$input.val(charArr.join(''));
                    instance.$input.trigger('otp:change');

                }

            });

            instance.$chars.on('keyup', function (evt) {

                const $this = $(this);
                const { selectionStart, selectionEnd } = this;

                switch (evt.key.toLowerCase()) {

                    case 'backspace': {

                        const index = $this.index();
                        const $prev = $this.prev('.otp-char');

                        if ((selectionStart === 0) || (selectionEnd === 0)) {
                            evt.preventDefault();
                            evt.stopImmediatePropagation();
                        }

                        if ($prev.length) {
                            $prev.focus();
                            $prev.get(0).setSelectionRange(1, 1);
                        }

                        charArr[index] = '';

                        instance.$input.val(charArr.join(''));
                        instance.$input.trigger('otp:change');

                        break;
                    }

                    case 'delete': {

                        const index = $this.index();
                        const $nextAll = $this.nextAll('.otp-char');

                        if ($nextAll.length) {

                            if ((selectionStart === 0) || (selectionEnd === 0)) {

                                const value = $this.next().val();

                                charArr[index] = value;

                                $this.val(value);

                            }

                            $nextAll.each(function (index, el) {

                                const $el = $(el);
                                const value = $el.next().val();
                                const $next = $el.next('.otp-char');

                                if (!$next.length || !$next.val()) {
                                    $el.val('');
                                } else {
                                    $el.val($next.val());
                                }

                                $this.get(0).setSelectionRange(selectionStart, selectionEnd);

                                charArr[index] = value;

                            })

                            instance.$input.val(charArr.join(''));
                            instance.$input.trigger('otp:change');

                        }

                        break;
                    }

                    case 'arrowleft': {
                        break;
                    }

                    case 'arrowright': {
                        break;
                    }

                    case 'tab': {
                        break;
                    }

                    default: {

                        if ($this.val().length) {

                            const $next = $this.next('.otp-char');

                            if ($next.length) {

                                $next.focus();
                                $next.get(0).setSelectionRange(0, 0);

                            }

                        }

                    }

                }

            });

        }

        instance.interval = null;

        instance.duration = null;

        instance.requested = null;

        instance.expires = null;

        instance.options = options;

        instance.active = false;

        instance.$otp = $(`

            <div class="otp-bg">
                <div class="otp-modal">
                    <div class="otp-modal-header">
                        <h3 class="otp-title">${title}</h3>
                    </div>
                    <div class="otp-modal-body">
                        <p class="otp-subtitle">${subtitle}</p>
                        <svg width="64" height="64" viewBox="0 0 128 128" class="otp-timeout">
                            <circle class="bg"></circle>
                            <circle class="fg"></circle>
                        </svg>
                        <div>
                            <div class="otp-char-container"></div>
                            <label class="otp-label">${label}</label>
                        </div>
                        <div class="otp-alert otp-invalid">${invalid}</div>
                        <div class="otp-alert otp-expired">${expired}<span class="otp-resend-btn">${resend}</span></div>
                    </div>
                    <div class="otp-modal-footer">
                        ${((events.onCancelClick instanceof Function) ? `<button class="otp-cancel-btn">${cancel}</button>` : '')}
                        <button class="otp-retry-btn" disabled>${retry}</button>
                        <button class="otp-validate-btn" disabled>${validate}</button>
                    </div>
                </div>
                <input class="otp-input" name="${name}" type="hidden" />
            </div>
            
        `);

        instance.$container = this;

        instance.$form = instance.$container.closest('form');

        instance.$modal = instance.$otp.find('.otp-modal');

        instance.$timeout = instance.$otp.find('.otp-timeout');

        instance.$charsContainer = instance.$otp.find('.otp-char-container');

        instance.$chars = instance.$otp.find('.otp-char');

        instance.$input = instance.$otp.find('.otp-input');

        instance.$resend = instance.$otp.find('.otp-resend-btn');

        instance.$cancel = instance.$otp.find('.otp-cancel-btn');

        instance.$retry = instance.$otp.find('.otp-retry-btn');

        instance.$validate = instance.$otp.find('.otp-validate-btn');

        instance.$errorMessageContainer = instance.$otp.find('.otp-invalid');

        /**
         * 
         * Not used because chars are
         * rendered from server response 
         * 
         * attachCharEventListeners(); 
         * 
         */

        instance.$input.on('otp:change', function (evt) {

            if ((instance.expires !== null) && (Date.now() < instance.expires)) {

                const $this = $(this);

                console.log($this.val().length, options.chars);

                if ($this.val().length === options.chars) {
                    instance.$retry.prop('disabled', false);
                    instance.$validate.prop('disabled', false);
                } else {
                    instance.$retry.prop('disabled', true);
                    instance.$validate.prop('disabled', true);
                }

            }

        });

        instance.show = async function (f = () => { }) {

            if (!instance.active) {

                try {

                    instance.active = true;
                    instance.requested = Date.now();

                    const data = await instance.request();

                    if (instance.options.fetch.requestOTP.onRequest.call(instance, data, undefined) === true) {

                        instance.interval = setInterval(() => {

                            if (instance.expires !== null && Date.now() >= instance.expires) {

                                clearInterval(instance.interval);

                                instance.$validate.prop('disabled', true);
                                instance.$otp.addClass('expired');

                            }

                        }, 1000);

                        instance.$timeout.css('animation-duration', `${instance.duration}ms`);
                        instance.$otp.addClass('visible');

                    }

                } catch (err) {

                    clearInterval(instance.interval);

                    instance.options.fetch.requestOTP.onRequest.call(instance, undefined, err);

                    instance.$retry.prop('disabled', false);
                    instance.$otp.addClass('retry');
                    instance.$timeout.css('animation-duration', '');
                    instance.interval = null;
                    instance.duration = null;
                    instance.requested = null;
                    instance.expires = null;

                }

                instance.$otp.trigger('otp:show');
                instance.$otp.stop(true, false).fadeIn(animation.fade);
                instance.$modal.stop(true, false).animate({
                    transform: 50,
                    top: '50%'
                }, {
                    duration: animation.position,
                    step: function (now, fx) {
                        if (fx.prop === 'transform') {
                            instance.$modal.css('transform', `translateX(-50%) translateY(${(now - 100)}%)`);
                        }
                    },
                    complete: function () {

                        if (f instanceof Function) {
                            f();
                        }

                        instance.$otp.trigger('otp:shown');

                    }
                });

            }

        }

        instance.hide = function (f = () => { }) {

            if (instance.active) {

                instance.$otp.trigger('otp:hide');
                instance.$modal.stop(true, false).animate({
                    transform: 50,
                    top: '0%'
                }, {
                    duration: animation.position,
                    step: function (now, fx) {
                        if (fx.prop === 'transform') {
                            instance.$modal.css('transform', `translateX(-50%) translateY(-${(50 + now)}%)`);
                        }
                    },
                });
                instance.$otp.stop(true, false).fadeOut(animation.fade, function () {

                    clearInterval(instance.interval);

                    instance.$chars.val('');
                    instance.$input.val('');
                    instance.$otp.removeClass('visible expired invalid retry');
                    instance.$retry.prop('disabled', true);
                    instance.$validate.prop('disabled', true);
                    instance.$timeout.css('animation-duration', '');
                    instance.interval = null;
                    instance.duration = null;
                    instance.requested = null;
                    instance.expires = null;
                    instance.active = false;

                    if (f instanceof Function) {
                        f();
                    }

                    instance.$otp.trigger('otp:hidden');

                });

            }

        }

        instance.setErrorMessage = function (err = invalid) {

            if (err instanceof Error) {
                instance.$errorMessageContainer.text(err.message);
            } else {
                instance.$errorMessageContainer.text(err);
            }

            instance.$otp.addClass('invalid');

        }

        instance.destroy = function () {

            if (instance.$form.length) {
                instance.$form.off('submit', onSubmit);
            }

            instance.$container.removeData('otp');
            instance.$otp.remove();

        }

        instance.refresh = function () {

            instance.destroy();
            instance.$container.OTP(options);

        }

        instance.request = async function () {

            const { requestOTP } = instance.options.fetch;
            const { body, ...rest } = requestOTP.options;
            const url = createURL(requestOTP.url);

            let resp, data;

            if (requestOTP.options.method.toLowerCase() === 'post') {

                resp = await fetch(url, {
                    ...rest,
                    body: body ? JSON.stringify(body) : undefined
                });

            } else {

                resp = await fetch(url, rest);

            }

            data = await resp.json();

            if (!('validityInSeconds' in data) || !Number.isInteger(data.validityInSeconds) || (data.validityInSeconds < 1)) {
                throw new Error('Invalid Server Response');
            }

            if (!('length') in data || !Number.isInteger(data.length) || (data.length < 1)) {
                throw new Error('Invalid Server Response');
            }

            const compensation = (Date.now() - instance.requested) / 2;

            instance.duration = data.validityInSeconds;
            instance.expires = (new Date((instance.requested + (instance.duration - compensation)))).getTime();

            options.chars = data.length;

            instance.$chars = $(generateInputChars(data.length));
            instance.$charsContainer.empty();
            instance.$charsContainer.append(instance.$chars);

            attachCharEventListeners();

            return data;

        }

        instance.validate = async function () {

            const { validateOTP } = instance.options.fetch;
            const { body, ...rest } = validateOTP.options;
            const url = createURL(validateOTP.url);

            let resp, data;

            if (validateOTP.options.method.toLowerCase() === 'post') {

                resp = await fetch(url, {
                    ...rest,
                    body: body ? JSON.stringify({
                        ...body,
                        [name]: instance.$input.val()
                    }) : undefined
                });

            } else {

                url.searchParams.set(name, instance.$input.val());

                resp = await fetch(url, rest);

            }

            data = await resp.json();

            if (!('result' in data) || (typeof data.result !== 'boolean')) {
                throw new Error('Invalid Server Response');
            }

            return data;

        }

        instance.$resend.on('click', async function (evt) {

            try {

                clearInterval(instance.interval);

                instance.$otp.removeClass('visible expired invalid retry');
                instance.$timeout.css('animation-duration', '');
                instance.$input.val('');
                instance.$chars.val('');
                instance.interval = null;
                instance.duration = null;
                instance.requested = null;
                instance.expires = null;
                instance.requested = Date.now();
                
                const data = await instance.request();
                
                if (instance.options.fetch.requestOTP.onRequest.call(instance, data, undefined) === true) {
                    
                    instance.$retry.prop('disabled', true);
                    instance.$validate.prop('disabled', true);

                    instance.interval = setInterval(() => {

                        if (instance.expires !== null && Date.now() >= instance.expires) {

                            clearInterval(instance.interval);

                            instance.$validate.prop('disabled', true);
                            instance.$otp.addClass('expired');

                        }

                    }, 1000);

                    instance.$timeout.css('animation-duration', `${instance.duration}ms`);
                    instance.$otp.addClass('visible');

                }

            } catch (err) {
                
                clearInterval(instance.interval);

                instance.options.fetch.requestOTP.onRequest.call(instance, undefined, err);

                instance.$retry.prop('disabled', false);
                instance.$validate.prop('disabled', true);
                instance.$otp.removeClass('expired').addClass('invalid retry');
                instance.$timeout.css('animation-duration', '');
                instance.interval = null;
                instance.duration = null;
                instance.requested = null;
                instance.expires = null;

            }

        });

        instance.$retry.on('click', function (evt) {
            instance.$resend.trigger('click');
        });

        if (instance.$cancel.length) {

            instance.$cancel.on('click', function (evt) {

                if (events.onCancelClick instanceof Function) {
                    events.onCancelClick.call(this, evt, instance);
                }

            });

        }

        if (instance.$form.length) {

            instance.$form.on('submit', onSubmit);

            instance.$validate.on('click', async function (evt) {

                evt.preventDefault();
                evt.stopImmediatePropagation();

                try {

                    const data = await instance.validate();

                    if (instance.options.fetch.validateOTP.onValidate.call(instance, data, undefined) === true) {

                        instance.hide(() => {
                            instance.$otp.trigger('otp:valid');
                            instance.$form.off('submit', onSubmit).submit();
                        });

                    }

                } catch (err) {

                    instance.options.fetch.validateOTP.onValidate.call(instance, undefined, err);
                    instance.$otp.trigger('otp:invalid');

                }

            });

        } else {

            instance.$validate.on('click', async function (evt) {

                evt.preventDefault();
                evt.stopImmediatePropagation();

                try {

                    const data = await instance.validate();

                    if (instance.options.fetch.validateOTP.onValidate.call(instance, data, undefined) === true) {

                        instance.hide(() => {
                            instance.$otp.trigger('otp:valid');
                        });

                    }

                } catch (err) {

                    instance.options.fetch.validateOTP.onValidate.call(instance, undefined, err);
                    instance.$otp.trigger('otp:invalid');

                }

            });

        }

        instance.$container.data('otp', instance)

        $(document.body).append(instance.$otp);

        return instance.$container;

    };

})(jQuery);