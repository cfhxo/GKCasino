import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const orderId = searchParams.get("token"); // Use "token" as the order ID

        const verifyPayment = async (attempt = 1) => {
            if (!orderId) return;

            console.log(`Verifying payment (Attempt ${attempt}):`, orderId);

            try {
                const response = await fetch("https://backend.casino.ghana-kebabs.com/api/paypal/verify-payment", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ orderID: orderId }), // Send the token as orderID
                });

                const data = await response.json();
                console.log("Response data:", data);

                if (data.success) {
                    console.log("Payment verified and wallet updated:", data);
                    alert("Payment was successful! Wallet updated.");
                    // Redirect to the home page
                    window.location.href = "/";
                } else {
                    console.error("Payment verification failed:", data);

                    // Retry up to 5 times with a delay
                    if (attempt < 5) {
                        setTimeout(() => verifyPayment(attempt + 1), 10000); // Retry after 10 seconds
                    } else {
                        alert("Payment verification failed. Please contact support.");
                        window.location.href = "/";
                    }
                }
            } catch (error) {
                console.error("Error verifying payment:", error);

                // Retry up to 5 times with a delay
                if (attempt < 5) {
                    setTimeout(() => verifyPayment(attempt + 1), 10000); // Retry after 10 seconds
                } else {
                    alert("Error verifying payment. Please contact support.");
                    window.location.href = "/";
                }
            }
        };

        verifyPayment(); // Start the verification process
    }, [searchParams]);

    return (
        <div>
            <h1>Processing Payment...</h1>
            <p>Please wait while we verify your payment. This may take a few minutes.</p>
        </div>
    );
};

export default PaymentSuccess;