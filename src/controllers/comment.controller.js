import mongoose , {isValidObjectId} from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    // get all comment documents from teh comments collction where `video` field matches the videoId
    // we need : userAvatar , username and full name and createdat, updated at fields for every comment
    // so, every comment doc will have the owner details embedded within it

    if(!videoId || !isValidObjectId(videoId))
        throw new ApiError(409 , "Invalid video id or the video doesnt exist")

    const pipeline = [
        {
            $match:{
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                    {
                        $project:{
                            avatar:1,
                            fullName:1,
                            username:1,
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            },
        },
        {
            $project:{
                _id:1,
                content:1,
                createdAt:1,
                updatedAt:1,
                owner:1
            }
        }
    ]

    
    if(!pipeline.length)
        throw new ApiError(400 , "Failed to build aggregation pipeline")

    const aggregate = Comment.aggregate(pipeline)       // builds the aggregation query
    const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 1
    }

    const comments = await Comment.aggregatePaginate(aggregate, options)        //gets the real results with option+aggregate query

    if(!comments)
        throw new ApiError(409 , "Failed to fetch comments for the given video")

    return res
    .status(200)
    .json(
        new ApiResponse(200 , comments , "Comments fetched succesfully")
    )

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video

    // we will get videId from params
    // userId from loggedIn user
    // content from the req object
    // validate all are there
    // thats it, create the comment document

    const { videoId } = req.params
    const {content} = req.body

    if(!videoId || !isValidObjectId(videoId))
        throw new ApiError(409 , "Invalid video id or the video doesnt exist")

    if(!content.length())
        throw new ApiError(409 , "Comment cannot be empty")

    const comment = await Comment.create({
        video:videoId,
        owner:req.user?._id,
        content:content
    })

    if(!comment)
        throw new ApiError(409 , "Failed to post comment")

    return res
    .status(200)
    .json(
        new ApiResponse(200 , comment , "Commented succesfully on the video")
    )
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment

    const { commentId } = req.params
    const {content} = req.body

    if(!commentId || !isValidObjectId(commentId))
        throw new ApiError(409 , "Invalid video id or the video doesnt exist")

    if(!content.length())
        throw new ApiError(409 , "Comment cannot be empty")

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId , 
        {
            $set:{
                content:content
            }
        }
    )

    if(!updatedComment)
        throw new ApiError(409 , "Failed to update comment")

    return res
    .status(200)
    .json(
        new ApiResponse(200 , updatedComment , "Comment updated succesfully on the video")
    )
    
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment

    const { commentId } = req.params

    if(!commentId || !isValidObjectId(commentId))
        throw new ApiError(409 , "Invalid video id or the video doesnt exist")

    const deleted = await Comment.findByIdAndDelete(commentId)

    if(!deleted)
        throw new ApiError(409 , "Video doent exist or faile dto delete from databse")

    return res
    .status(200)
    .json(
        new ApiResponse(200 , deleted , "Comment deleted succesfully")
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }