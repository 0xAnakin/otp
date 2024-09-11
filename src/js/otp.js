(function ($) {

    const defaults = {
        name: 'otp',
        length: 4,
        fetch: {
            requestOTP: {
                url: 'http://localhost:3001/api/request.json',
                options: {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
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
                }
            }
        },
        i18n: {
            title: 'Σύνδεση',
            label: 'Κωδικός μια χρήσης',
            help: 'Παρακαλώ εισάγετε τον κωδικό μιας χρήσης που σας έχει αποσταλλεί.',
            resend: 'ΕΠΑΝΑΠΟΣΤΟΛΗ',
            validate: 'ΣΥΝΕΧΕΙΑ'
        },
        events: {
            onRequest: function (res) {

                const { duration } = res;
                const compensation = (Date.now() - this.requested) / 2;

                this.duration = duration;
                this.expires = (new Date((this.requested + this.duration - compensation))).getTime();

            },
            onValidate: function (res) {

                if (('valid' in res) && (res.valid === true)) {
                    return true;
                }

                return false;

            }
        }
    };

    $.fn.OTP = function (options = defaults) {

        const block = {};
        const charArr = [];
        const instance = {};
        const { name, length, i18n, events } = options;
        const { title, label, help, resend, validate } = i18n;

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
                        <svg width="64" height="64" viewBox="0 0 128 128" class="otp-timeout">
                            <circle class="bg"></circle>
                            <circle class="fg"></circle>
                        </svg>
                    </div>
                    <div class="otp-modal-body">
                        <label class="otp-label">${label}</label>
                        <div class="otp-char-container">
                            ${(() => {

                const arr = [];

                for (let i = 0; i < length; i++) {
                    arr.push(`<input class="otp-char otp-char-${i}" type="text" maxlength="1" autocorrect="off" autocomplete="off" />`);
                }

                return arr.join('\n');

            })()}
                        </div>
                        <small class="otp-help">${help}</small>
                    </div>
                    <div class="otp-modal-footer">
                        <button class="otp-resend-btn-footer">${resend}</button>
                        <button class="otp-validate-btn-footer" disabled>${validate}</button>
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

        instance.$resend = instance.$otp.find('.otp-resend-btn-footer');

        instance.$validate = instance.$otp.find('.otp-validate-btn-footer');

        instance.$chars.on('keydown', function (evt) {

            const $this = $(this);
            const key = evt.key.toLowerCase();
            const { selectionStart, selectionEnd } = this;

            switch (key) {

                case 'tab': {

                    evt.preventDefault();
                    evt.stopImmediatePropagation();

                    const $next = $this.next('.otp-char');

                    if ($next.length) {
                        $next.focus();
                        $next.get(0).setSelectionRange(0, 0);
                    }

                    break;

                }

            }

        });

        instance.$chars.on('input', function (evt) {

            const $this = $(this);
            const index = $this.index();
            const value = $this.val();

            if (value.length) {

                const $next = $this.next('.otp-char');
                
                if ($next.length && !$next.val().length) {
                    $next.focus();
                }

                charArr[index] = value;

                instance.$input.val(charArr.join(''));
                instance.$input.trigger('otp:change');

            }

        });

        instance.$chars.on('keyup', function (evt) {

            const $this = $(this);
            const key = evt.key.toLowerCase();
            const { selectionStart, selectionEnd } = this;

            switch (key) {

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

                    const $prev = $this.prev('.otp-char');

                    if ($prev.length) {
                        $prev.focus();
                        $prev.get(0).setSelectionRange(1, 1);
                    }

                    break;
                }

                case 'arrowright': {

                    const $next = $this.next('.otp-char');

                    if ($next.length) {
                        $next.focus();
                        $next.get(0).setSelectionRange(0, 0);
                    }

                    break;
                }

            }

        });

        
        instance.$input.on('otp:change', function (evt) {
            
            const $this = $(this);

            if ($this.val().length === length) {
                instance.$validate.prop('disabled', false);
            } else {
                instance.$validate.prop('disabled', true);
            }

        });

        instance.show = async function () {

            if (!instance.active) {

                try {

                    instance.active = true;
                    instance.requested = Date.now();

                    await instance.request();

                    instance.interval = setInterval(() => {

                        if (Date.now() >= instance.expires) {

                            clearInterval(instance.interval);

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

                instance.$otp.stop(true, false).fadeIn(function () {
                    instance.$modal.stop(true, false).animate({
                        transform: 'translateX(-50%) translatey(-50%)',
                        top: '50%'
                    }, {
                        duration: 300,
                        complete: function () {

                        }
                    });
                });

            }

        }

        instance.hide = function () {

            if (instance.active) {

                instance.$modal.stop(true, false).animate({
                    transform: 'translateX(-50%) translatey(-100%)',
                    top: '0%'
                }, {
                    duration: 300,
                    complete: function () {
                        instance.$otp.stop(true, false).fadeOut(function () {

                            clearInterval(instance.interval);

                            instance.$otp.removeClass('visible expired invalid');
                            instance.$timeout.css('animation-duration', '');
                            instance.interval = null;
                            instance.duration = null;
                            instance.requested = null;
                            instance.expires = null;
                            instance.active = false;

                        });
                    }
                });

            }

        }

        instance.destroy = function () {

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

            this.options.events.onRequest.call(this, data);

        }.bind(instance);

        instance.validate = async function () {

            try {

                const { validationCFG } = this.options.fetch;
                const resp = await fetch(validationCFG.url, validationCFG.options);
                const data = await resp.json();

                return this.options.events.onValidate.call(this, data);

            } catch (err) {
                console.error(`An error occurred because of ${err.message}, while validating an one time password!`);
            }

            return false;

        }.bind(instance);

        instance.$resend.on('click', async function (evt) {

            try {

                clearInterval(instance.interval);

                instance.$otp.removeClass('visible expired invalid');
                instance.$timeout.css('animation-duration', '');
                instance.interval = null;
                instance.duration = null;
                instance.requested = null;
                instance.expires = null;
                instance.active = false;
                instance.requested = Date.now();
                instance.$resend.prop('disabled', true);

                await instance.request();

                instance.$resend.prop('disabled', false);
                instance.interval = setInterval(() => {

                    if (Date.now() >= instance.expires) {

                        clearInterval(instance.interval);

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

                console.error(`An error occurred because of ${err.message}, while requesting a new one time password!`);

            }

        });

        if (instance.$form.length) {

            instance.$form.on('submit', function (evt) {

                evt.preventDefault();
                evt.stopImmediatePropagation();

                const valid = instance.validate();

                if (valid) {
                    instance.$form.submit();
                } else {
                    instance.$otp.addClass('invalid');
                }

            });

        }

        this.data('otp', instance)
        this.append(instance.$otp);

        return this;

    };

})(jQuery);