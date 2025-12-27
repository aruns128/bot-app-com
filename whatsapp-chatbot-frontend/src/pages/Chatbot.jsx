import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
    FaBirthdayCake,
    FaCookieBite,
    FaBreadSlice,
    FaPlus,
    FaCheck,
    FaHome,
    FaRoad,
    FaMapPin,
    FaPaperPlane,
    FaDownload
} from "react-icons/fa";

const API_BASE_URL = "http://localhost:3000";
const PHONE = "1234567";

export default function Chatbot() {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [buttons, setButtons] = useState([]);
    const messagesEndRef = useRef(null);
    const [orderId, setOrderId] = useState(null);


    /* auto scroll */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    /* init */
    useEffect(() => {
        setMessages([
            { type: "bot", text: "Type Hi to start." }
        ]);
    }, []);

    const downloadInvoiceFromUrl = async (url, orderId) => {
        try {
            setLoading(true);

            const res = await axios.get(url, {
                responseType: "blob",
            });

            const blob = new Blob([res.data], { type: "application/pdf" });
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `${orderId}.pdf`;
            document.body.appendChild(link);
            link.click();

            link.remove();
            window.URL.revokeObjectURL(blobUrl);

            pushBot("📄 Invoice downloaded successfully!");
        } catch (err) {
            console.error("Download failed", err);
            pushBot("❌ Unable to download invoice.");
        } finally {
            setLoading(false);
        }
    };



    /* ---------- SEND MESSAGE ---------- */
    const sendToBackend = async ({ text, interactiveId, display }) => {
        if (!text && !interactiveId) return;

        /* SHOW MESSAGE IN UI (TITLE, NOT ID) */
        if (display) {
            setMessages(prev => [...prev, { type: "user", text: display }]);
        }

        setLoading(true);
        setInputValue("");

        try {
            const payload = {
                from: PHONE,
                ...(text ? { text } : {}),
                ...(interactiveId ? { interactiveId } : {})
            };
            let res;

            if (["payment:pay_now"].includes(payload.interactiveId)) {
                res = await axios.post(
                    `${API_BASE_URL}/payment/mock-success`,
                    { phone: PHONE }
                );
            } else if (payload?.interactiveId === "order:download_invoice") {
                res = await axios.post(
                    `${API_BASE_URL}/payment/mock-success`,
                    { phone: PHONE }
                );

                if (res.data?.ok && res.data.invoiceUrl) {
                    await downloadInvoiceFromUrl(
                        res.data.invoiceUrl,
                        res.data.orderId
                    );
                }
                return;
            } else {
                res = await axios.post(
                    `${API_BASE_URL}/whatsapp/mock-incoming`,
                    payload
                );
            }

            console.log("Backend response:", res.data?.ok, res.data.result?.action, res.data);
            if (res.data?.ok) {
                handleAction(res.data.result?.action, res.data.result);
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setMessages(prev => [
                ...prev,
                { type: "bot", text: "❌ Something went wrong. Please try again." }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const startNewOrder = async () => {
    try {
        setLoading(true);

        // Reset UI immediately
        setMessages([]);
        setButtons([]);

        // Reset backend conversation state
        const res = await axios.post(
            `${API_BASE_URL}/admin/cart/${PHONE}/clear`,
            { }
        );

        // Start fresh flow
        pushBot("👋 Hi! Welcome back.");
        pushBot("Please select a category:");

        // Trigger first state action
        if (res.data?.ok) {
            handleAction("sent_categories", res.data.result);
        }
    } catch (err) {
        console.error("Failed to reset conversation", err);
        pushBot("❌ Unable to start a new order.");
    } finally {
        setLoading(false);
    }
};


    /* ---------- HANDLE BOT ACTION ---------- */
    const handleAction = (action, data) => {
        console.log("Handling action:", action, data);
        switch (action) {
            case "sent_categories":
                pushBot("Please select a category:");
                setButtons([
                    { id: "cat:cakes", title: "Cakes", icon: <FaBirthdayCake /> },
                    { id: "cat:cookies", title: "Cookies", icon: <FaCookieBite /> },
                    { id: "cat:pastries", title: "Pastries", icon: <FaBreadSlice /> }
                ]);
                break;

            case "sent_items":
                pushBot("Select an item:");
                setButtons([
                    { id: "item:cake_choco", title: "Chocolate Cake ₹500", icon: <FaBirthdayCake /> },
                    { id: "item:cake_vanilla", title: "Vanilla Cake ₹450", icon: <FaBirthdayCake /> }
                ]);
                break;

            case "ask_qty":
                pushBot("Choose quantity:");
                setButtons([1, 2, 3, 4, 5].map(q => ({
                    id: `qty:${q}`,
                    title: q.toString(),
                    icon: <FaPlus />
                })));
                break;

            case "cart_updated":
                pushBot(`Cart updated 🛒\nTotal ₹${data.total}`);
                setButtons([
                    { id: "cart:add_more", title: "Add more", icon: <FaPlus /> },
                    { id: "cart:checkout", title: "Checkout", icon: <FaCheck /> }
                ]);
                break;

            case "ask_house":
                pushBot("Enter House / Flat No");
                setButtons([]);
                break;

            case "ask_street":
                pushBot("Enter Street / Area");
                setButtons([]);
                break;

            case "ask_pincode":
                pushBot("Enter Pincode");
                setButtons([]);
                break;

            case "confirm_address":
                pushBot("Confirm this address?");
                setButtons([
                    { id: "addr:confirm", title: "Confirm", icon: <FaCheck /> },
                    { id: "addr:edit_house", title: "Edit House", icon: <FaHome /> },
                    { id: "addr:edit_street", title: "Edit Street", icon: <FaRoad /> },
                    { id: "addr:edit_pincode", title: "Edit Pincode", icon: <FaMapPin /> }
                ]);
                break;
            case "payment_link_sent":
                pushBot(data.order_info);
                setButtons([
                    { id: "payment:pay_now", title: "Pay Now", icon: <FaCheck /> }
                ]);
                break;
            case "payment_pending_reminder":
                pushBot(`💳 Please complete the payment using below link. Once paid, invoice will be sent.`);
                setButtons([
                    { id: "payment:pay_now", title: "Pay Now", icon: <FaCheck /> }
                ]);
                break;
            case "mock_paid_and_invoiced":
                pushBot("✅ Payment received! Invoice has been sent to your WhatsApp.");
                setButtons([
                    {
                        id: "order:download_invoice",
                        title: "Download Invoice",
                        icon: <FaDownload />,
                    },
                   {
                        id: "new:order",
                        title: "New Order",
                        icon: <FaPlus />,
                        action: startNewOrder
                    }

                ]);
                break;

            case "no_action":
                const stateDefaultActionMap = {
                    NEW: "send_categories",
                    CATEGORY: "send_items",
                    ITEM: "ask_qty",
                    QTY: "cart_updated",
                    CART: "add_more",
                    ADDRESS_HOUSE: "ask_street",
                    ADDRESS_STREET: "ask_pincode",
                    ADDRESS_PINCODE: "confirm_address",
                    ADDRESS_CONFIRM: "payment_link_sent",
                    PAYMENT_PENDING: "payment_pending_reminder",
                    INVOICED: "mock_paid_and_invoiced"
                }
                const defaultAction = stateDefaultActionMap[data.state];
                console.log("Default action for state", data.state, "is", defaultAction);
                if (defaultAction) handleAction(defaultAction, data);
                break;


            default:
                setButtons([]);
        }
    };

    const pushBot = (text) => {
        setMessages(prev => [...prev, { type: "bot", text }]);
    };

    /* ---------- INPUT ---------- */
    const handleSendText = () => {
        if (!inputValue.trim()) return;
        sendToBackend({ text: inputValue, display: inputValue });
    };

    const handleKeyDown = (e) => {
        if (buttons.length > 0) return;
        if (e.key === "Enter" && !loading) handleSendText();
    };

    return (
        <div className="h-full flex flex-col bg-[#efeae2] rounded-lg overflow-hidden">
            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto p-4 pb-36 space-y-3">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.type === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                            className={`max-w-xs px-4 py-2 rounded-lg text-sm whitespace-pre-line ${m.type === "user"
                                ? "bg-[#dcf8c6] rounded-br-none"
                                : "bg-white shadow rounded-bl-none"
                                }`}
                        >
                            {m.text}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* FOOTER */}
            <div className="sticky bottom-0 bg-[#f0f2f5]">
                {buttons.length > 0 && (
                    <div className="px-4 py-2 space-y-2 border-t">
                        {buttons.map(b => (
                            <button
                                key={b.id}
                                onClick={() =>
                                    sendToBackend({
                                        interactiveId: b.id,
                                        display: b.title
                                    })
                                }
                                className="w-full flex items-center gap-3 bg-green-600 text-white p-3 rounded-xl shadow active:scale-95"
                            >
                                {b.icon} {b.title}
                            </button>
                        ))}
                    </div>
                )}

                <div className="p-3 flex gap-2 border-t">
                    <input
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={buttons.length > 0 || loading}
                        placeholder="Type message"
                        className="flex-1 rounded-full px-4 py-2 border focus:outline-none"
                    />
                    <button
                        onClick={handleSendText}
                        disabled={buttons.length > 0 || loading}
                        className="bg-green-500 text-white px-4 rounded-full"
                    >
                        <FaPaperPlane />
                    </button>
                </div>
            </div>
        </div>
    );
}