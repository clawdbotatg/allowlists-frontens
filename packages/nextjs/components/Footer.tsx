import React from "react";
import { useFetchNativeCurrencyPrice } from "@scaffold-ui/hooks";
import { CurrencyDollarIcon } from "@heroicons/react/24/outline";
import { SwitchTheme } from "~~/components/SwitchTheme";

/**
 * Site footer
 */
export const Footer = () => {
  const { price: nativeCurrencyPrice } = useFetchNativeCurrencyPrice();

  return (
    <div className="min-h-0 py-5 px-1 mb-11 lg:mb-0">
      <div>
        <div className="fixed flex justify-between items-center w-full z-10 p-4 bottom-0 left-0 pointer-events-none">
          <div className="flex flex-col md:flex-row gap-2 pointer-events-auto">
            {nativeCurrencyPrice > 0 && (
              <div>
                <div className="btn btn-primary btn-sm font-normal gap-1 cursor-auto">
                  <CurrencyDollarIcon className="h-4 w-4" />
                  <span>{nativeCurrencyPrice.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
          <SwitchTheme className="pointer-events-auto" />
        </div>
      </div>
      <div className="w-full">
        <ul className="menu menu-horizontal w-full">
          <div className="flex justify-center items-center gap-2 text-sm w-full">
            <div className="text-center">
              <a
                href="https://github.com/clawdbotatg/allowlists-frontens"
                target="_blank"
                rel="noreferrer"
                className="link"
              >
                Fork this frontend
              </a>
            </div>
            <span>·</span>
            <div className="text-center">
              <a
                href="https://etherscan.io/address/0xcB0b0531e86A9aC36Fa865cA8e3dbccF047FDA91#code"
                target="_blank"
                rel="noreferrer"
                className="link"
              >
                Contract
              </a>
            </div>
            <span>·</span>
            <div className="text-center">
              <a href="https://scaffoldeth.io" target="_blank" rel="noreferrer" className="link">
                Built with 🏗 Scaffold-ETH 2
              </a>
            </div>
          </div>
        </ul>
      </div>
    </div>
  );
};
