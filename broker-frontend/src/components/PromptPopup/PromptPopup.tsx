import React, {FC, useState} from "react";
import "./PromptPopup.css";
import BigNumber from "bignumber.js";
import {Trans} from "@lingui/macro";
import {InputText} from "../Swap/Inputs";

export interface PromptPopupProps {
    title: string;
    callback: (amount: BigNumber) => void;
}

type Props = {
    props: PromptPopupProps;
    onClose: () => void;
};

export const PromptPopup: FC<Props> = (props) => {
    const [text, setText] = useState('');

    const onClick = (e: React.MouseEvent) => {
        props.props.callback(new BigNumber(text));
        props.onClose();
    }

    return (
        <div className="group promptPopup">
            <div className="popup_h">{props.props.title}</div>
            <div className="popup_body">
                <div className="popup_body-h">Enter amount:</div>
                <InputText className="promptPopup_input" value={text} onChange={e => setText(e.currentTarget.value)}/>
                <button className="btn-primary" onClick={onClick}>
                    <Trans id="components.prompt_popup.ok">
                        OK
                    </Trans>
                </button>
            </div>
        </div>
    )
}
