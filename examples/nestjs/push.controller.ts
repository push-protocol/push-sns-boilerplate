import {
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Req,
} from "@nestjs/common";
import fetch from "node-fetch";
import * as Validator from "sns-payload-validator";

@Controller("epns")
export class PushController {
  protected logger: Logger;
  protected validator: Validator;

  constructor() {
    //initialize sns validator and logger
    this.validator = new Validator();
    this.logger = new Logger("PushController");
  }

  @HttpCode(HttpStatus.OK)
  @Post("sns")
  // Make sure you are using @Req instead of @Body
  async loginUser(@Req() req: any) {
    this.logger.debug("Received push request");

    // Concatenate request chunks  to a data string
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const data = Buffer.concat(buffers).toString();

    if (!data) {
      this.logger.debug("Invalid data received, hence skipping");
      return { message: "Invalid data received" };
    }

    // transform data back to a payload object
    const payload = JSON.parse(data);
    try {
      //SNS payload validator
      await this.validator.validate(payload);
    } catch (err) {
      this.logger.error("payload sender validation failed", err);
      return { message: "Your message could not validated" };
    }

    // process diferent payload types
    this.logger.debug(payload.Type, payload);
    switch (payload.Type) {
      case "Notification":
        const obj = JSON.parse(payload["Message"]);
        this.logger.debug(
          `messaged received from EPNS ::  ${obj["payload"]["data"]["amsg"]}`
        );
      case "SubscriptionConfirmation":
        const url = payload.SubscribeURL;
        this.logger.debug("SubscriptionConfirmation" + payload);
        const response = await fetch(url);

        if (response.status === 200) {
          this.logger.debug("Subscription confirmed");
          return;
        } else {
          console.error("Subscription failed");
          throw new HttpException("Subscription failed", 500);
        }
      default:
        this.logger.error(`payload type '${payload.Type}' unhandled`);
        return;
    }
  }
}
