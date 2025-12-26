export async function createPaymentLink({ amount, phone, referenceId }) {
  return {
    id: `mock_plink_${Date.now()}`,
    short_url: `https://mockpay.local/pay?ref=${referenceId}&amount=${amount}&phone=${phone}`,
    status: "created"
  };
}
