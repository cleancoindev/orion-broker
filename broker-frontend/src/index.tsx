import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import store from './redux/store'
import './css/main.css';
import {BrowserRouter as Router} from "react-router-dom";
import {WithTheme, WithTranslate} from "./hocs";
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
                    <WithTranslate>
                        <WithTheme>
                            <Preloader/>
                        </WithTheme>
                    </WithTranslate>
                </Router>
            </Provider>
        </React.StrictMode>,
        document.getElementById('root')
    );
}

start();


