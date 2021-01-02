import React, {FC} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {Popup} from "@orionprotocol/orion-ui-kit";
import {getCurrentPopup} from "../../redux/selectors";
import {closePopup} from "../../redux/actions";
import {POPUP_TYPE} from "./Popups.enums";
import {SwalPopup} from "./SwalPopup/SwalPopup";
import {ConfirmAddWalletPopup} from "./ConfirmAddWalletPopup/ConfirmAddWalletPopup";
import AddWalletPopup from "./AddWalletPopup/AddWalletPopup";
import BigNumber from "bignumber.js";

type Props = {
    // TODO: should probably move login logic to redux?
    onLogin: () => void
    onApprove: (currency: string, amount: BigNumber, gasPriceWei: BigNumber) => Promise<boolean>;
    onDeposit: (currency: string, amount: BigNumber, gasPriceWei: BigNumber) => Promise<boolean>;
    onWithdraw: (currency: string, amount: BigNumber, gasPriceWei: BigNumber) => Promise<boolean>;
}

export const Popups: FC<Props> = ({
                                      onLogin,
                                      onApprove,
                                      onDeposit,
                                      onWithdraw
                                  }) => {
    const dispatch = useDispatch();

    const currentPopup = useSelector(getCurrentPopup)

    const is = (type: POPUP_TYPE) => currentPopup === type

    return (
        <>
            {is(POPUP_TYPE.ADD_WALLET_POPUP) && (
                <Popup onClose={() => dispatch(closePopup(POPUP_TYPE.ADD_WALLET_POPUP))}>
                    <AddWalletPopup
                        onLogin={() => {
                            onLogin();
                            dispatch(closePopup(POPUP_TYPE.ADD_WALLET_POPUP))
                        }}
                    />
                </Popup>
            )}

            {is(POPUP_TYPE.CONFIRM_ADD_WALLET_POPUP) && (
                <Popup onClose={() => dispatch(closePopup(POPUP_TYPE.CONFIRM_ADD_WALLET_POPUP))}>
                    <ConfirmAddWalletPopup/>
                </Popup>
            )}

            {is(POPUP_TYPE.SWAL_POPUP) && (
                <Popup onClose={() => dispatch(closePopup(POPUP_TYPE.SWAL_POPUP))}>
                    <SwalPopup/>
                </Popup>
            )}
        </>
    );
};
