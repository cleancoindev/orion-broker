import blessed from 'blessed';

const screen = blessed.screen({
    smartCSR: true
});

screen.title = 'Orion Broker';

screen.key(['escape', 'q', 'C-c'], (ch, key) => {
    return process.exit(0);
});

export class TerminalUI {
    constructor() {
        this.isProduction = false;
        this.log = null;
        this.onCreatePassword = null;
        this.onLoginPassword = null;
        this.onMain = null;
        this.onCmd = null;
    }

    showHello() {
        const form = blessed.form({
            parent: screen,
            keys: true,
            top: 'center',
            left: 'center',
            width: 100,
            height: 22,
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: '#202034',
                border: {
                    fg: '#f0f0f0'
                },
            },
            content: '{center}Welcome to Orion Broker{/center}'
        });

        const icon = blessed.image({
            parent: form,
            top: 2,
            left: 5,
            type: 'ansi',
            width: 80,
            height: 10,
            file: __dirname + '/../logo.png',
            search: false
        });

        blessed.text({
            parent: form,
            top: 14,
            left: 6,
            content: 'Version: 1.0.0'
        });

        blessed.text({
            parent: form,
            top: 15,
            left: 6,
            content: 'Codebase: https://github.com/orionprotocol/orion-broker'
        });

        const submit = blessed.button({
            parent: form,
            mouse: true,
            keys: true,
            left: 'center',
            bottom: 1,
            height: 1,
            width: 10,
            tags: true,
            name: 'submit',
            content: '{center}OK{/center}',
            style: {
                bg: '#4FA4E3',
                focus: {
                    bg: '#4FA4E3'
                },
                hover: {
                    bg: '#FF6F00'
                }
            }
        });

        submit.focus();

        submit.on('press', () => {
            this.showBlaBla();
        });

        screen.render();
    }

    showBlaBla() {
        const form = blessed.form({
            parent: screen,
            keys: true,
            top: 'center',
            left: 'center',
            width: 100,
            height: 22,
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: '#202034',
                border: {
                    fg: '#f0f0f0'
                },
            },
            content: '{center}Important Warning{/center}'
        });

        blessed.text({
            parent: form,
            top: 2,
            left: 1,
            content: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum. 
        
Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.`
        });

        const submit = blessed.button({
            parent: form,
            mouse: true,
            keys: true,
            left: 'center',
            bottom: 1,
            height: 1,
            width: 10,
            tags: true,
            name: 'submit',
            content: '{center}OK{/center}',
            style: {
                bg: '#4FA4E3',
                focus: {
                    bg: '#4FA4E3'
                },
                hover: {
                    bg: '#FF6F00'
                }
            }
        });

        submit.focus();

        submit.on('press', () => {
            this.showSetPassword();
        });

        screen.render();
    }

    showSetPassword() {
        const form = blessed.form({
            parent: screen,
            keys: true,
            top: 'center',
            left: 'center',
            width: 100,
            height: 22,
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: '#202034',
                border: {
                    fg: '#f0f0f0'
                },
            },
            content: '{center}Important Warning{/center}'
        });

        blessed.text({
            parent: form,
            top: 2,
            left: 1,
            content: `SET A SECURE PASSWORD: 
        
To use Orion Broker, you will need ot give it access to your crypto assets by entering
your exchange API keys and/or wallet private keys. These keys are not shared with
anyone, including us.
        
On the next screen, you will set a password to protect these keys and other sensitive
data. Please store this password safely since there is no way to reset it.
        `
        });


        const submit = blessed.button({
            parent: form,
            mouse: true,
            keys: true,
            left: 'center',
            bottom: 1,
            height: 1,
            width: 10,
            tags: true,
            name: 'submit',
            content: '{center}OK{/center}',
            style: {
                bg: '#4FA4E3',
                focus: {
                    bg: '#4FA4E3'
                },
                hover: {
                    bg: '#FF6F00'
                }
            }
        });

        submit.focus();

        submit.on('press', () => this.showSetPasswordForm());

        screen.render();
    }

    showConfirmPasswordForm(password, err = null) {
        const form = blessed.box({
            parent: screen,
            keys: true,
            top: 'center',
            left: 'center',
            width: '50%',
            height: 'shrink',
            tags: true,
            border: {
                type: 'line'
            },
            content: 'Confirm new password:'
        });


        const msg = blessed.message({
            parent: screen,
            top: 'center',
            left: 'center',
            height: 'shrink',
            width: '50%',
            align: 'center',
            tags: true,
            hidden: true,
            border: 'line'
        });


        const passwordPrompt = blessed.textbox({
            parent: form,
            top: 3,
            height: 1,
            censor: true,
            focusable: true,
            inputOnFocus: true,
            mouse: true,
        });


        if (err) {
            msg.focus();
            msg.error(err, () => passwordPrompt.focus() || screen.render());
        }

        const submit = blessed.button({
            parent: form,
            mouse: true,
            keys: true,
            top: 6,
            left: 1,
            height: 1,
            width: 10,
            tags: true,
            name: 'submit',
            focusable: false,
            content: '{center}OK{/center}',
            style: {
                focus: {
                    bg: '#4FA4E3'
                },
                hover: {
                    bg: '#FF6F00'
                }
            }
        });

        const cancel = blessed.button({
            parent: form,
            mouse: true,
            keys: true,
            top: 6,
            left: 11,
            height: 1,
            width: 10,
            tags: true,
            name: 'cancel',
            content: '{center}Cancel{/center}',
            style: {
                focus: {
                    bg: '#4FA4E3'
                },
                hover: {
                    bg: '#FF6F00'
                }
            }
        });

        passwordPrompt.on('submit', (value) => {
            if (value == null || !value.length) {
                msg.focus();
                msg.error('Please enter password', () => passwordPrompt.focus() || screen.render());
            } else if (value !== password) {
                msg.focus();
                msg.error('Try again', () => passwordPrompt.focus() || screen.render());
            } else {
                this.onCreatePassword(password);
            }
        });

        passwordPrompt.on('cancel', () => {
            form.hide();
            form.destroy();
            screen.render();
        });

        submit.on('press', () => {
            const value = passwordPrompt.getValue();
            if (value == null || !value.length) {
                this.showConfirmPasswordForm(password, 'Please enter password');
            } else if (value !== password) {
                this.showConfirmPasswordForm(password, 'Try again');
            } else {
                form.hide();
                form.destroy();
                screen.render();

                this.onCreatePassword(password);
            }
        });

        cancel.on('press', function () {
            passwordPrompt.cancel();
        });


        screen.render();

        passwordPrompt.focus();

        screen.render();
    }

    showSetPasswordForm(err = null) {
        const form = blessed.box({
            parent: screen,
            keys: true,
            top: 'center',
            left: 'center',
            width: '50%',
            height: 'shrink',
            tags: true,
            border: {
                type: 'line'
            },
            content: 'Enter new password:'
        });


        const msg = blessed.message({
            parent: screen,
            top: 'center',
            left: 'center',
            height: 'shrink',
            width: '50%',
            align: 'center',
            tags: true,
            hidden: !err,
            border: 'line'
        });


        const passwordPrompt = blessed.textbox({
            parent: form,
            top: 3,
            height: 1,
            censor: true,
            focusable: true,
            inputOnFocus: true,
            mouse: true,
        });


        if (err) {
            msg.focus();
            msg.error(err, () => passwordPrompt.focus() || screen.render());
        }

        const submit = blessed.button({
            parent: form,
            mouse: true,
            keys: true,
            top: 6,
            left: 1,
            height: 1,
            width: 10,
            tags: true,
            name: 'submit',
            focusable: false,
            content: '{center}OK{/center}',
            style: {
                focus: {
                    bg: '#4FA4E3'
                },
                hover: {
                    bg: '#FF6F00'
                }
            }
        });

        const cancel = blessed.button({
            parent: form,
            mouse: true,
            keys: true,
            top: 6,
            left: 11,
            height: 1,
            width: 10,
            tags: true,
            name: 'cancel',
            content: '{center}Cancel{/center}',
            style: {
                focus: {
                    bg: '#4FA4E3'
                },
                hover: {
                    bg: '#FF6F00'
                }
            }
        });

        passwordPrompt.on('submit', (value) => {
            if (value == null || !value.length) {
                msg.focus();
                msg.error('Please enter password', () => passwordPrompt.focus() || screen.render());
            } else {
                const password = value;

                form.hide();
                form.destroy();
                screen.render();

                this.showConfirmPasswordForm(password);


            }
        });

        passwordPrompt.on('cancel', () => {
            form.hide();
            form.destroy();
            screen.render();
        });

        submit.on('press', () => {
            const value = passwordPrompt.getValue();
            if (value == null || !value.length) {
                this.showSetPasswordForm('Please enter password');
            } else {
                const password = value;

                this.showConfirmPasswordForm(password);
            }
        });

        cancel.on('press', function () {
            passwordPrompt.cancel();
        });


        screen.render();

        passwordPrompt.focus();

        screen.render();
    }

    showLogin() {
        const form = this.loginForm = blessed.box({
            parent: screen,
            keys: true,
            top: 'center',
            left: 'center',
            width: '50%',
            height: 'shrink',
            tags: true,
            border: {
                type: 'line'
            },
            content: 'Enter password:'
        });

        const msg = blessed.message({
            parent: screen,
            top: 'center',
            left: 'center',
            height: 'shrink',
            width: '50%',
            align: 'center',
            tags: true,
            hidden: true,
            border: 'line'
        });


        const passwordPrompt = blessed.textbox({
            parent: form,
            top: 3,
            height: 1,
            censor: true,
            focusable: true,
            inputOnFocus: true,
            mouse: true,
        });

        const submit = blessed.button({
            parent: form,
            mouse: true,
            keys: true,
            top: 6,
            left: 1,
            height: 1,
            width: 10,
            tags: true,
            name: 'submit',
            content: '{center}OK{/center}',
            style: {
                focus: {
                    bg: '#4FA4E3'
                },
                hover: {
                    bg: '#FF6F00'
                }
            }
        });

        const cancel = blessed.button({
            parent: form,
            mouse: true,
            keys: true,
            top: 6,
            left: 11,
            height: 1,
            width: 10,
            tags: true,
            name: 'cancel',
            content: '{center}Cancel{/center}',
            style: {
                focus: {
                    bg: '#4FA4E3'
                },
                hover: {
                    bg: '#FF6F00'
                }
            }
        });

        const restoreFocus = () => {
            passwordPrompt.focus();
            screen.render();
        };

        passwordPrompt.on('submit', (value) => {
            if (value == null || !value.length) {
                msg.error('Please enter password', restoreFocus);
            } else if (!this.onLoginPassword(value)) {
                msg.error('Invalid password', restoreFocus);
            } else {
                form.destroy();
                screen.render();
            }
        });

        submit.on('press', () => {
            const value = passwordPrompt.getValue();
            if (value == null || !value.length) {
                msg.error('Please enter password', restoreFocus);
            } else if (!this.onLoginPassword(value)) {
                msg.error('Invalid password', restoreFocus);
            }
        });

        cancel.on('press', () => {
            process.exit(0);
        });

        screen.render();

        passwordPrompt.focus();

        screen.render();
    }

    showMain() {
        if (this.loginForm) {
            this.loginForm.hide();
            this.loginForm.destroy();
            screen.render();
        }
        const leftBox = blessed.box({
            parent: screen,
            keys: true,
            top: 1,
            left: 0,
            width: '50%',
            height: '100%-1',
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: '#202034',
                border: {
                    fg: '#f0f0f0'
                },
            },
            content: '{center}Orion Broker{/center}'
        });

        const rightBox = blessed.box({
            parent: screen,
            keys: true,
            top: 1,
            left: '50%',
            width: '50%',
            height: '100%-1',
            tags: true,
            border: {
                type: 'line'
            },
            style: {
                fg: 'white',
                bg: '#202034',
                border: {
                    fg: '#f0f0f0'
                },
            },
            content: '{center}Log{/center}'
        });

        blessed.text({
            parent: screen,
            top: 0,
            left: 1,
            content: 'Version: 1.0.0'
        });

        blessed.text({
            parent: screen,
            top: 0,
            left: 24,
            content: 'Emulator Mode: ' + (this.isProduction ? 'OFF' : 'ON'),
            style: {
                fg: 'yellow'
            }
        });

        blessed.text({
            parent: screen,
            top: 0,
            right: 2,
            content: '[Esc] QUIT',
            style: {
                fg: 'gray'
            }
        });

        // const icon = blessed.image({
        //     parent: leftBox,
        //     top: 2,
        //     left: 'center',
        //     type: 'ansi',
        //     width: 24,
        //     height: 10,
        //     file: __dirname + '/icon.png',
        //     search: false
        // });

        const history = blessed.log({
            parent: rightBox,
            top: 1,
            left: 0,
            width: '100%-2',
            height: '100%-3',
        });
        this.history = history;

        const log = blessed.log({
            parent: leftBox,
            top: 1,
            left: 0,
            width: '100%-2',
            height: '100%-10',
        });
        this.log = log;

        log.add('Welcome to Orion Broker!');
        log.add('');
        log.add('Helpful Links:');
        log.add('Learn how to use Orion Broker: https://broker.orionprotocol.io');
        log.add('');
        log.add('Useful Commands:');
        this.onMain();

        const textbox = blessed.textbox({
            parent: leftBox,
            bottom: 5,
            left: 0,
            width: '100%-2',
            height: 1,
            mouse: true,
            keys: true,
            inputOnFocus: true
        });

        textbox.on('submit', (data) => {
            log.add(data);
            log.add(this.onCmd(data));
            textbox.setValue('');
            screen.render();
            textbox.focus();
        });

        textbox.focus();

        screen.render();
    }
}

