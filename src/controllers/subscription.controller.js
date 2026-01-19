import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    // TODO: toggle subscription

    if (!channelId || !isValidObjectId(channelId))
        throw new ApiError(409, "Invalid channel id or the channel does not exist")

    const userId = req.user?._id
    console.log(userId + " \t" + channelId);

    const existingSubscription = await Subscription.find(
        {
            $and: [
                { channel: new mongoose.Types.ObjectId(channelId) },
                { subscriber: new mongoose.Types.ObjectId(userId) }
            ]
        }
    )
    // console.log(existingSubscription);
    
    if (existingSubscription.length === 0) {
        const newSubscriber = await Subscription.create({
            subscriber: userId,
            channel: channelId
        })

        if (!newSubscriber)
            throw new ApiError(409, "Failed to subscribe to the given channel")

        return res
            .status(200)
            .json(
                new ApiResponse(200, newSubscriber, "Subscribed succesfully")
            )


    }
    else {
        const unSubscribed = await Subscription.findByIdAndDelete(existingSubscription[0]._id)
        console.log(existingSubscription);

        if (!unSubscribed)
            throw new ApiError(409, "Failed to un-subscribe to the given channel")

        return res
            .status(200)
            .json(
                new ApiResponse(200, unSubscribed, "Un-Subscribed succesfully")
            )
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    // match all those documents in subscriptions with same channelId
    // for every doc, lookup the subscriberId in users collection and return username, fullname, avatar

    if (!channelId || !isValidObjectId(channelId))
        throw new ApiError(409, "Invalid channel id or the channel does not exist")

    const pipeline = [
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberInfo",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            username: 1,
                            fullName: 1,
                            _id: 1
                        }
                    }
                ]
            }
        },
        {
            $project: {
                subscriberInfo: 1,
                _id: 0
            }
        }
    ]

    if (!pipeline.length)
        throw new ApiError(409, "Failed to construct pipeline")

    const subscribersList = await Subscription.aggregate(pipeline)

    if (!subscribersList)
        throw new ApiError(409, "Failed to fetch subscriber data from database")

    return res
        .status(200)
        .json(
            new ApiResponse(200, subscribersList[0], "Subscribers list fetched succesfully")
        )

})



// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!subscriberId || !isValidObjectId(subscriberId))
        throw new ApiError(409, "Invalid channel id or the channel does not exist")

    const pipeline = [
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelInfo",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            username: 1,
                            fullName: 1,
                            _id: 1
                        }
                    }
                ]
            }
        },
        {
            $project: {
                channelInfo: 1,
                _id: 0
            }
        }
    ]

    if (!pipeline.length)
        throw new ApiError(409, "Failed to construct pipeline")

    const channelsSubscribedToList = await Subscription.aggregate(pipeline)

    if (!channelsSubscribedToList)
        throw new ApiError(409, "Failed to fetch the channels subscribed to by user")

    return res
        .status(200)
        .json(
            new ApiResponse(200, channelsSubscribedToList[0], "Subscribers list fetched succesfully")
        )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}