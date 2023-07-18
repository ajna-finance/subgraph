import { BigInt } from '@graphprotocol/graph-ts'
import { assert, describe, test } from "matchstick-as/assembly/index";
import { ONE_BI } from "../src/utils/constants";
import { bigIntToBytes, bytesToBigInt } from "../src/utils/convert";

  describe("Conversions", () => {
    test("Reliably convert integer contract values to bytes", () => {
        const one_bi = BigInt.fromU32(1)
        const one_number = 1
        assert.bigIntEquals(one_bi, BigInt.fromI32(one_number));

        const one_bytes_from_bi = bigIntToBytes(one_bi);
        const one_bytes_from_number = bigIntToBytes(BigInt.fromI32(one_number));
        assert.bytesEquals(one_bytes_from_bi, one_bytes_from_number);
    });
  });