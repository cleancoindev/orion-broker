import React, {useEffect} from "react";
import "./Notify.css";
import {useDispatch, useSelector} from "react-redux";
import {hideNotify} from "../../redux/actions";
import {getNotifyText} from "../../redux/selectors";

interface NotifyProps {
}

export function Notify(props: NotifyProps) {
    const dispatch = useDispatch();
    const text = useSelector(getNotifyText);

    const hide = () => dispatch(hideNotify());

    useEffect(() => {
        const timer = setTimeout(() => hide(), 3000);
        return () => clearTimeout(timer);
    }, [text]);

    return text ? (
        <div className="notify" onClick={hide}>
            <div className="notify_h">{text}</div>
        </div>
    ) : null;
}