import {
    getSubscribedChannels,
    getUserChannelSubscribers,
    toggleSubscription
} from "../controllers/subscription.controller.js"

import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"


const router = Router()

router.route("/toggle-subscribe/:channelId").post(verifyJWT, toggleSubscription)
router.route("/channel-subscribers/:channelId").get(getUserChannelSubscribers)
router.route("/channels-subscribed/:subscriberId").get(verifyJWT, getSubscribedChannels)

export default router