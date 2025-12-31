import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body;

    if (!content)
        throw new ApiError(409, "Tweet cannot be empty")

    const tweet = await Tweet.create({
        content: content,
        owner: req.user?._id
    })

    if (!tweet)
        throw new ApiError(409, "Failed to post a tweet")

    return res
        .status(200)
        .json(
            new ApiResponse(200, tweet, "Tweet posted succesfully")
        )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets

    const id = req.user?._id

    const pipeline = [
        {
            $match: {
                owner: new mongoose.Types.ObjectId(id)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignFiel: "_id",
                as: "owner"
            }
        },
        {
            $project: {
                username: 1,
                fullName: 1,
                avatar: 1
            }
        },
        {
            $project: {
                _id: 1,
                content: 1,
                username: 1,
                fullName: 1,
                avatar: 1,
                createdAt: 1,
            }
        }
    ]

    const tweets = await Tweet.aggregate(pipeline)

    if (!tweets.length)
        throw new ApiError(400, "Failed to fetch user tweets")

    return res
        .status(200)
        .json(
            new ApiResponse(200, tweets, "Succesfully fetched user tweets")
        )
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet

    const { tweetId } = req.params
    const { content } = req.body

    if (!isValidObjectId(tweetId))
        throw new ApiError(409, "Invalid tweet id")

    if (!content.length())
        throw new ApiError(409, "Tweet cannot be empty")

    const updatedTweet = await Comment.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content: content
            }
        }
    )

    if (!updatedTweet)
        throw new ApiError(409, "Failed to update tweet")

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedTweet, "Tweet updated succesfully")
        )
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet

    const { tweetId } = req.params

    if (!tweetId || !isValidObjectId(tweetId))
        throw new ApiError(409, "Invalid tweet id or the tweet doesnt exist")

    const deleted = await Comment.findByIdAndDelete(tweetId)

    if (!deleted)
        throw new ApiError(409, "tweet doent exist or faile dto delete from databse")

    return res
        .status(200)
        .json(
            new ApiResponse(200, deleted, "Comment deleted succesfully")
        )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}