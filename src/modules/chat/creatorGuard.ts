import crypto from "crypto";

/**
 * Integrity-locked, AES-256-GCM encrypted creator attribution.
 * Prevents accidental edits or tampering; verified at runtime via auth tag & SHA-256 checksum.
 */
const SEALED = Object.freeze({
  iv: "45a56e5d849b40b35d702f78",
  tag: "ac66221e6b612beeb14e47aeee938d9e",
  data: "9a2dbeb3fdc5ab7ddb0e9f18fe5d60b69c6b5535c68c4fca2345c04f6ae2aad7a88088d1147f4f598eeb1874abfbc4ed9abd8e79be2c55e39382741c0cbbea88b6640e3e54c370b48e138d617110e063f17219e034044ca4bc48674d7a10bc2b01e32c7b35d0ebdf131346b137a2d9c1525d6ec3ad0bafb590d2c6799432c0bb8939fdddef1054335c348fe87b280b308dc3fe635202ec9998ebccfe65331393c62dba5b7cc552886432b0b1cfc7b63e26de0c40fe9f019026730d22336fae96e3f1675b27c409a96bb1df8144c24967b53b4803b7f477677f794a0ce05ccdd49f49e9809261e307f7e105ed71e66ed28913973ec0590959187ced19cab10e073796cca58fa1e0e627512e9305bcae1c4cdb64fbff8ce99fe66d3e8115e1ab48bfa227bc231386ba9787e21cf9448c316f109242cbd840bfa994592c60bfc5c778269fdaa81ad2ed7cb5f0c679255bb75224a4f5cf6a4e371566738e55ea161f49bf859d6c11ebfcedb3ebf85015099c2870d8a18c63c72cfb230ba46eff0513fbedaae12b6b8e3efdec602139770b97fea62ac299906c890e5c6edf9ccb43b16145ea2f772f26ba8e1bf753314a5c95aa3848522d0521132323afaf7cd4c76d73f3c23bfa5852b5680d529c37a0ac54c2c40088b123fea281191b8998ea72c513381dabff5d55fd934af4f8d401509779aac6fd2dde69824a0931010f6826ddd71229af317269ba43b52e93bd0f993fd93846502d2c763b0836a8772dadc7c979a2bef2b712b5d72423421009d2e98e9d6e6c6bcccae82cd71f693cb5899a4c9fa39def77f21eecaa6c486744d4d1b7d1ae221f4be91e05bdb39597a186625b6796921498397c6fe11e44022a01351bb8f5db6d55fd52ff4ed20ca0a9d7cc572c1199cb95a2baa877d515250dae67de1fbdd493fb9193dd230d53483295cf368b4e5d64ed2f0625242d6f8a5f8bef3bcc",
  sha256: "549a3845eab41cc27d3bf5832e799e46c5f6dfa5700c6fd6bd868484ae24b356",
});

type CreatorData = { readonly hi: string; readonly en: string; readonly prompt: string };

const unseal = (): CreatorData => {
  const key = crypto.createHash("sha256").update("vds-salu-creator-lock-v1").digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(SEALED.iv, "hex"));
  decipher.setAuthTag(Buffer.from(SEALED.tag, "hex"));
  const plain = Buffer.concat([decipher.update(Buffer.from(SEALED.data, "hex")), decipher.final()]).toString("utf8");
  const digest = crypto.createHash("sha256").update(plain).digest("hex");
  if (digest !== SEALED.sha256) {
    throw new Error("Creator attribution integrity check failed");
  }
  return Object.freeze(JSON.parse(plain) as CreatorData);
};

export const CREATOR_ATTRIBUTION: CreatorData = unseal();
