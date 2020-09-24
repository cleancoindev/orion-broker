import React, {FC, useContext, useEffect, useState} from 'react';
import {Trans} from "@lingui/macro";
import {Link, useHistory, useLocation} from "react-router-dom";
import "./LeftSidebar.css"
import "./MobileSidebar.css"
import {Theme} from "../Theme";
import {Language} from "../Language";
import {useDispatch, useSelector} from "react-redux";
import {getCurrentPair, getLogged} from "../../redux/selectors";

type Props = {
    onDisconnectWallet: () => void;
};

export const LeftSidebar: FC<Props> = (props) => {
    const {theme, toggleTheme} = useContext(Theme);
    const dispatch = useDispatch();
    const currentPair = useSelector(getCurrentPair);
    const isLogged = useSelector(getLogged);

    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        function onClick() {
            setIsOpen(false);
        }

        document.body.addEventListener('click', onClick);
        return function cleanup() {
            document.body.removeEventListener('click', onClick);
        };
    });

    return (
        <>
            <div id="leftSidebar" className={isOpen ? 'open' : ''} onMouseEnter={() => setIsOpen(true)}
                 onMouseLeave={() => setIsOpen(false)}>
                <div id="leftSidebar_content">
                    <div id="leftSidebar_logo"/>

                    <Link to="/">
                        <div
                            className={`leftSidebar_btn ${location.pathname.indexOf('/stats') > -1 ? 'selected' : ''}`}
                            onClick={() => setIsOpen(false)}>
                            <div className="leftSidebar_btnIcon icon-trade"/>
                            Orders
                        </div>
                    </Link>


                    <Link to="/dashboard">
                        <div
                            className={`leftSidebar_btn ${location.pathname === '/dashboard' ? 'selected' : ''}`}
                            onClick={() => setIsOpen(false)}>
                            <div className="leftSidebar_btnIcon icon-dashboard"/>
                            Balances
                        </div>
                    </Link>


                    <div className="grow"/>

                    <div id="leftSidebar_themeSwitch" className="leftSidebar_btn" onClick={() => {
                        toggleTheme();
                        setIsOpen(false)
                    }}>
                        <div id="leftSidebar_themeSwitchIconBg">
                            <div id="leftSidebar_themeSwitchIcon"/>
                        </div>
                        <span>
                            <Trans id="components.left_sidebar.dark_mode">
                                Dark Mode
                            </Trans>
                        </span>
                    </div>

                    <Language/>
                </div>
            </div>

            <div id="mobileSidebar">
                <div id="mobileSidebar_logo" onClick={() => {
                    setIsOpen(!isOpen)
                }}/>
                <div className="mobileSidebar_menu" onClick={() => {
                    setIsOpen(!isOpen)
                }}/>
            </div>
        </>
    )
}
