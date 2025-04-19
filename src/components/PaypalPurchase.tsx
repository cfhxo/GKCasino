import React, { useEffect, useRef } from "react";

interface PaypalPurchaseProps {
  amount: number;
  token: string;
  onSuccess?: (walletBalance: number) => void;
}

const PaypalPurchase: React.FC<PaypalPurchaseProps> = ({ amount, token, onSuccess }) => {
  const paypalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.paypal || !paypalRef.current) return;

    window.paypal.Buttons({
      style: {
        layout: 'horizontal',
        color: 'blue',
        shape: 'pill',
        label: 'pay',
        height: 40,
      },
      createOrder: (data, actions) => {
        return actions.order.create({
          purchase_units: [
            {
              amount: {
                value: amount.toString(),
              },
            },
          ],
        });
      },
      onApprove: async (data) => {
        const orderID = data.orderID;

        const res = await fetch("/api/paypal/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ orderID, amount }),
        });

        const result = await res.json();
        if (res.ok && onSuccess) {
          onSuccess(result.walletBalance);
        } else {
          alert("Payment failed");
        }
      },
      onError: (err) => {
        console.error("PayPal Checkout error:", err);
      },
    }).render(paypalRef.current);
  }, [amount, token]);

  return <div ref={paypalRef} />;
};

export default PaypalPurchase;
