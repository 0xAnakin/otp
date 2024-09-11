# OTP

### Usage

```html

    <form action="/index.html" method="GET">
        <div id="otp-container"></div>
    </form>
    <script>
        $(function () {

            $('#otp-container').OTP();

            const otp = $('#otp-container').data('otp');
            const options = {};
            
            otp.show(options);

        })    
    </script>

```

### Configuration

```js
const options = {
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
            title: 'Connect',
            label: 'One time password',
            help: 'Please enter the one-time code that has been sent to you.',
            resend: 'RESEND',
            validate: 'CONTINUE',
            expired: 'The code sent has expired.',
            invalid: 'The code is not correct.'
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
    }
```

### Events

- `otp:show` - Fired when the show animation starts.
- `otp:shown` - Fired when the show animation ends.
- `otp:hide` - Fired when the hide animation start.
- `otp:hidden` - Fired when the hidden animation ends.

```js
        $(function () {

            $('#otp-container').OTP();

            const otp = $('#otp-container').data('otp');

            otp.$otp.on('otp:shown', function() {
                alert('OTP is now visible!');
            });

            otp.show(options);

        })    

```

### Methods

- `show()` - Triggers the specified plugin instance and shows the modal to the user.
- `hide()` - Hides and hides and reset the specified plugin instance.
- `destroy()` - Removes the plugin instance.
- `refresh()` - Refreshes the plugin instance.