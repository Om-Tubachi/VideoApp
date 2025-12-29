import {
    getSubscribedChannels,
    getUserChannelSubscribers,
    toggleSubscription
} from "../controllers/subscription.controller.js"

import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"


const subscriberRouter = Router()

subscriberRouter.route("/toggle-subscribe/:channelId").post(verifyJWT, toggleSubscription)
subscriberRouter.route("/channel-subscribers/:channelId").get(getUserChannelSubscribers)
subscriberRouter.route("/channels-subscribed/:channelId").get(verifyJWT, getSubscribedChannels)

export default subscriberRouter