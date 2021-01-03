// Should be very first to not break css precedence
import '@orionprotocol/orion-ui-kit/dist/index.css'
import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import store from './redux/store'
import {BrowserRouter as Router} from "react-router-dom";
import {WithLanguage, WithTheme} from "@orionprotocol/orion-ui-kit";
import {Preloader} from "./Preloader";
// import * as Sentry from "@sentry/react";

// Sentry.init({
//     dsn: process.env.REACT_APP_SENTRY_DNS!,
//     environment: process.env.REACT_APP_SENTRY_ENVIRONMENT!,
// });

async function start() {
    ReactDOM.render(
        <React.StrictMode>
            <Provider store={store}>
                <Router>
                    <WithLanguage>
                        <WithTheme>
                            <Preloader/>
                        </WithTheme>
                    </WithLanguage>
                </Router>
            </Provider>
        </React.StrictMode>,
        document.getElementById('root')
    );
}

start();


