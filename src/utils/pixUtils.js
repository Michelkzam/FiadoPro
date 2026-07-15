export function generatePixPayload({ key, amount, merchantName = "", merchantCity = "" }) {
  const pad = (value, length) => String(value).padStart(length, "0");

  const crc16 = (str) => {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc = crc << 1;
        }
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  };

  const merchantAccount = `0014BR.GOV.BCB.PIX01${pad(key.length, 2)}${key}`;

  const merchantInfo = `0014${pad(merchantAccount.length, 2)}${merchantAccount}0201`;

  const additionalData = merchantCity
    ? `6009${pad(merchantCity.length, 2)}${merchantCity}62070503000`
    : "62070503000";

  let payload = "000201";
  payload += "26" + pad(merchantInfo.length, 2) + merchantInfo;
  payload += "52040000";
  payload += "5303986";
  payload += "54" + pad(String(amount).length, 2) + amount;
  payload += "5802BR";
  if (merchantName) {
    payload += "620805" + pad(merchantName.length, 2) + merchantName;
  }
  payload += additionalData;

  const payloadWithoutCRC = payload + "6304";
  const crc = crc16(payloadWithoutCRC);
  payload = payloadWithoutCRC + crc;

  return payload;
}
