import React, { useEffect, useState } from "react";
import Avatar from "../../Avatar";
import { FaRegBell, FaRegBellSlash } from "react-icons/fa";
import ClaimBonus from "../ClaimBonus";
import { IoMdExit } from "react-icons/io";
import { BiWallet } from "react-icons/bi";
import Monetary from "../../Monetary";
import { User } from "../../../components/Types";
import { toast } from "react-toastify";

interface RightContentProps {
    loading: boolean;
    userData: User;
    openNotifications: boolean;
    setOpenNotifications: React.Dispatch<React.SetStateAction<boolean>>;
    Logout: () => void;
}

const RightContent: React.FC<RightContentProps> = ({ loading, userData, openNotifications, setOpenNotifications, Logout }) => {
    const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
    const [selectedOption, setSelectedOption] = useState({ amount: 1.49, gp: 2500 }); // Default option
    const isMobile = window.innerWidth <= 768;

    const options = [
        { amount: 1.49, gp: 2500 },
        { amount: 2.99, gp: 5000 },
        { amount: 4.99, gp: 10000 },
    ];

    useEffect(() => {
        if (userData?.hasUnreadNotifications) {
            setHasUnreadNotifications(true);
        }
    }, [userData?.hasUnreadNotifications]);

    useEffect(() => {
        if (openNotifications) {
            setHasUnreadNotifications(false);
        }
    }, [openNotifications]);

    const handleTopUpClick = async () => {
        try {
            console.log("User Data:", userData); // Log the userData object to check its structure

            const userId = userData?._id || userData?.id; // Use _id if id is not present
            if (!userId) {
                toast.error("User ID is missing. Please log in again.");
                return;
            }

            const response = await fetch("https://backend.casino.ghana-kebabs.com/api/paypal/create-order", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId,
                    amount: selectedOption.amount, // Pass the selected amount
                    gp: selectedOption.gp, // Pass the selected GP value
                }),
            });

            const data = await response.json();
            if (data.approvalUrl) {
                // Redirect to PayPal in the same tab
                window.location.href = data.approvalUrl;
            } else {
                toast.error("Failed to retrieve PayPal approval URL.");
            }
        } catch (error) {
            console.error("Error in handleTopUpClick:", error); // Log any errors
            toast.error("Failed to create PayPal order. Please try again.");
        }
    };

    return (
        <div className="flex items-center gap-4">
            <div className="hidden md:flex">
                {!loading && (
                    // Button to claim bonus
                    <ClaimBonus bonusDate={userData?.nextBonus} userData={userData} />
                )}
            </div>

            {!loading && (
                <div className="flex flex-col items-start gap-1 text-green-400 font-normal text-lg hover:text-green-300 transition-all">
                    <div className="flex items-center gap-2">
                        <BiWallet className="text-2xl hidden md:block" />
                        <div className="max-w-[80px] md:max-w-[140px] overflow-hidden text-sm md:text-lg truncate">
                            <Monetary value={Math.floor(userData?.walletBalance)} />
                        </div>
                    </div>
                </div>
            )}

            {/* Dropdown for PayPal Top-Up Options */}
            {!loading && (
                <div className="relative">
                    <select
                        value={selectedOption.amount}
                        onChange={(e) => {
                            const selected = options.find(option => option.amount === parseFloat(e.target.value));
                            if (selected) setSelectedOption(selected);
                        }}
                        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-all cursor-pointer"
                    >
                        {options.map((option, index) => (
                            <option key={index} value={option.amount}>
                                ${option.amount.toFixed(2)} = GP{option.gp.toLocaleString()}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={handleTopUpClick}
                        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-all ml-2"
                    >
                        Top Up
                    </button>
                </div>
            )}

            <div className="relative cursor-pointer" onClick={() => setOpenNotifications(!openNotifications)}>
                {openNotifications ? (
                    <div>
                        <FaRegBellSlash style={{ fontSize: "20px" }} />
                    </div>
                ) : (
                    <div>
                        <FaRegBell style={{ width: "20px" }} />
                    </div>
                )}
                {hasUnreadNotifications && !openNotifications && (
                    <div className="absolute -top-1 -right-[2px] w-3 h-3 bg-red-500 rounded-full " />
                )}
            </div>
            <Avatar
                image={userData?.profilePicture}
                loading={loading}
                id={userData?.id}
                size={isMobile ? "small" : "medium"}
                level={userData?.level}
                showLevel={true}
            />
            <div
                className="text-[#625F7E] font-normal text-lg cursor-pointer hover:text-gray-200 transition-all"
                onClick={Logout}
            >
                <IoMdExit className="text-2xl" />
            </div>
        </div>
    );
};

export default RightContent;
