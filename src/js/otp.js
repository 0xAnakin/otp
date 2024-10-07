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
        chars: 4,
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
                onRequest: function (res) {

                    const { duration } = res;
                    const compensation = (Date.now() - this.requested) / 2;

                    this.duration = duration;
                    this.expires = (new Date((this.requested + (this.duration - compensation)))).getTime();

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
                onValidate: function (res) {

                    if (('valid' in res) && (res.valid === true)) {
                        return true;
                    }

                    return false;

                }
            }
        },
        i18n: {
            title: 'Σύνδεση',
            subtitle: 'Παρακαλώ εισάγετε τον κωδικό<br/>μιας χρήσης που σας έχει αποσταλλεί.',
            label: 'Κωδικός μια χρήσης',
            resend: 'Πατήστε εδώ για αποστολή νέου κωδικού.',
            validate: 'ΣΥΝΕΧΕΙΑ',
            cancel: 'ΚΛΕΙΣΙΜΟ',
            expired: 'O κωδικός που στάλθηκε έχει λήξει.<br/>',
            invalid: 'O κωδικός δεν είναι σωστός.'
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

        const charArr = [];
        const instance = {};
        const { name, chars, regex, i18n, animation, events } = options;
        const { title, subtitle, label, expired, invalid, resend, cancel, validate } = i18n;

        const onSubmit = function (evt) {

            evt.preventDefault();
            evt.stopImmediatePropagation();

            instance.show();

        }

        const generateInputChars = () => {

            const arr = [];

            for (let i = 0; i < chars; i++) {
                arr.push(`<input class="otp-char otp-char-${i}" type="text" maxlength="1" autocorrect="off" autocomplete="off" />`);
            }

            return arr.join('\n');

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
                        <label class="otp-label">${label}</label>
                        <div class="otp-char-container">
                            ${generateInputChars()}
                        </div>
                        <div class="otp-alert otp-invalid">${invalid}</div>
                        <div class="otp-alert otp-expired">${expired}<span class="otp-resend-btn">${resend}</span></div>
                    </div>
                    <div class="otp-modal-footer">
                        ${((events.onCancelClick instanceof Function) ? `<button class="otp-cancel-btn">${cancel}</button>` : '')}
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

        instance.$chars = instance.$otp.find('.otp-char');

        instance.$input = instance.$otp.find('.otp-input');

        instance.$resend = instance.$otp.find('.otp-resend-btn');

        instance.$cancel = instance.$otp.find('.otp-cancel-btn');

        instance.$validate = instance.$otp.find('.otp-validate-btn');

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

                case 'tab' : {
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

        instance.$input.on('otp:change', function (evt) {

            if ((instance.expires !== null) && (Date.now() < instance.expires)) {

                const $this = $(this);
                
                if ($this.val().length === chars) {
                    instance.$validate.prop('disabled', false);
                } else {
                    instance.$validate.prop('disabled', true);
                }

            }

        });

        instance.show = async function (f = () => { }) {

            if (!instance.active) {

                try {

                    instance.active = true;
                    instance.requested = Date.now();

                    await instance.request();

                    instance.interval = setInterval(() => {

                        if (Date.now() >= instance.expires) {

                            clearInterval(instance.interval);

                            instance.$validate.prop('disabled', true);
                            instance.$otp.addClass('expired');

                        }

                    }, 1000);

                    instance.$timeout.css('animation-duration', `${instance.duration}ms`);
                    instance.$otp.addClass('visible');

                } catch (err) {

                    clearInterval(instance.interval);

                    instance.$resend.prop('disabled', false);
                    instance.$otp.removeClass('visible expired invalid');
                    instance.$timeout.css('animation-duration', '');
                    instance.interval = null;
                    instance.duration = null;
                    instance.requested = null;
                    instance.expires = null;
                    instance.active = false;

                    console.error(`An error occurred because of ${err.message}, while requesting an one time password!`);

                    return;
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

                    instance.$otp.removeClass('visible expired invalid');
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

        instance.destroy = function () {

            if (instance.$form.length) {
                instance.$form.off('submit', onSubmit);
            }

            this.$container.removeData('otp');
            this.$otp.remove();

        }.bind(instance);

        instance.refresh = function () {

            this.destroy();
            this.$container.OTP(options);

        }.bind(instance);

        instance.request = async function () {

            const { requestOTP } = this.options.fetch;
            const resp = await fetch(requestOTP.url, requestOTP.options);
            const data = await resp.json();

            this.options.fetch.requestOTP.onRequest.call(this, data);

        }.bind(instance);

        instance.validate = async function () {

            try {

                const { validateOTP } = this.options.fetch;

                if (validateOTP.options.method.toLowerCase() === 'post') {

                    const url = createURL(validateOTP.url);
                    const payload = JSON.stringify({ [name]: instance.$input.val() })
                    const resp = await fetch(url, { ...validateOTP.options, body: payload });
                    const data = await resp.json();

                    return this.options.fetch.validateOTP.onValidate.call(this, data);

                } else {

                    const url = createURL(validateOTP.url);

                    url.searchParams.set(name, instance.$input.val());

                    const resp = await fetch(url, validateOTP.options);
                    const data = await resp.json();

                    return this.options.fetch.validateOTP.onValidate.call(this, data);

                }

            } catch (err) {
                console.error(`Error while validating an one time password: ${err.message}`);
            }

            return false;

        }.bind(instance);

        instance.$resend.on('click', async function (evt) {

            try {

                clearInterval(instance.interval);

                instance.$otp.removeClass('visible expired invalid');
                instance.$timeout.css('animation-duration', '');
                instance.$chars.val('');
                instance.$input.val('');
                instance.interval = null;
                instance.duration = null;
                instance.requested = null;
                instance.expires = null;
                instance.requested = Date.now();
                instance.$resend.prop('disabled', true);

                await instance.request();

                instance.$resend.prop('disabled', false);
                instance.$validate.prop('disabled', false);
                instance.interval = setInterval(() => {

                    if (Date.now() >= instance.expires) {

                        clearInterval(instance.interval);

                        instance.$validate.prop('disabled', true);
                        instance.$otp.addClass('expired');

                    }

                }, 1000);

                instance.$timeout.css('animation-duration', `${instance.duration}ms`);
                instance.$otp.addClass('visible');

            } catch (err) {

                clearInterval(instance.interval);

                instance.$resend.prop('disabled', false);
                instance.$otp.removeClass('visible expired invalid');
                instance.$timeout.css('animation-duration', '');
                instance.interval = null;
                instance.duration = null;
                instance.requested = null;
                instance.expires = null;

                console.error(`Error while requesting a new one time password: ${err.message}`);

            }

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

                const valid = await instance.validate();

                if (valid) {

                    instance.hide(() => {
                        instance.$otp.trigger('otp:valid');
                        instance.$form.off('submit', onSubmit).submit();
                    });

                } else {
                    instance.$otp.trigger('otp:invalid');
                    instance.$otp.addClass('invalid');
                }

            });

        } else {

            instance.$validate.on('click', async function (evt) {

                evt.preventDefault();
                evt.stopImmediatePropagation();

                const valid = await instance.validate();

                if (valid) {

                    instance.hide(() => {
                        instance.$otp.trigger('otp:valid');
                    });

                } else {
                    instance.$otp.trigger('otp:invalid');
                    instance.$otp.addClass('invalid');
                }

            });

        }

        instance.$container.data('otp', instance)
        
        $(document.body).append(instance.$otp);

        return instance.$container;

    };

})(jQuery);