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

                this.duration = duration;
                this.requested = Date.now();
                this.expires = new Date((this.requested + this.duration));

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

        const instance = {};
        const { name, length, i18n, } = options;
        const { title, label, help, resend, validate } = i18n;

        instance.$container = this;

        instance.duration = null;

        instance.requested = null;

        instance.expires = null;

        instance.options = options;

        instance.visible = false;

        instance.$form = this.closest('form');

        instance.$otp = $(`

            <div class="otp-bg">
                <div class="otp-modal">
                    <div class="otp-modal-header">
                        <h3 class="opt-title-header">${title}</h3>
                        <svg width="64" height="64" viewBox="0 0 128 128" class="otp-timeout">
                            <circle class="bg"></circle>
                            <circle class="fg"></circle>
                        </svg>
                    </div>
                    <div class="otp-modal-body">
                        <label class="otp-label-body">${label}</label>
                        <input class="otp-input-body" type="text" name="${name}" maxlength="${length}" autocorrect="off" autocomplete="off" style="max-width:${(length * 54.5)}px" value=""/>
                        <small class="otp-help-body">${help}</small>
                    </div>
                    <div class="otp-modal-footer">
                        <button class="otp-resend-btn-footer">${resend}</button>
                        <button class="otp-validate-btn-footer">${validate}</button>
                    </div>
                </div>
            </div>

        `);

        instance.$modal = instance.$otp.find('.otp-modal');

        instance.$timeout = instance.$otp.find('.otp-timeout');

        instance.$input = instance.$otp.find('.otp-input-body');

        instance.$resend = instance.$otp.find('.otp-resend-btn-footer');

        instance.$validate = instance.$otp.find('.otp-validate-btn-footer');

        instance.show = async function () {

            if (!instance.visible) {

                try {

                    instance.visible = true;

                    await instance.request();

                    instance.$timeout.css('animation-duration', `${instance.duration}ms`);
                    instance.$otp.addClass('visible');

                } catch (err) {

                    instance.visible = false;
                    instance.$otp.removeAttr('style');
                    instance.$otp.removeClass('visible');

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

            if (instance.visible) {

                instance.$modal.stop(true, false).animate({
                    transform: 'translateX(-50%) translatey(-100%)',
                    top: '0%'
                }, {
                    duration: 300,
                    complete: function () {
                        instance.$otp.stop(true, false).fadeOut(function () {
                            instance.visible = false;
                            instance.$otp.removeAttr('style');
                            instance.$otp.removeClass('visible');
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
            this.$container.AthexOTP(options);

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

        instance.$resend.on('click', function (evt) {
            instance.request();
        });

        /////////////////////////////////////////////

        // instance.$input.on('click keyup focus', function (evt) {

        //     console.log('->', this.selectionStart)

        //     if (this.selectionStart >= length) {
        //         this.setSelectionRange(length - 1, length - 1);
        //         this.blur();
        //     }

        // });

        ////////////////////////////////////////////

        if (instance.$form.length) {

            instance.$form.on('submit', function (evt) {

                evt.preventDefault();
                evt.stopImmediatePropagation();

                const valid = instance.validate();

                if (valid) {
                    instance.$form.submit();
                } else {
                    alert('Error validating!'); // temporary
                }

            });

        }

        this.data('otp', instance)
        this.append(instance.$otp);

        return this;

    };

})(jQuery);