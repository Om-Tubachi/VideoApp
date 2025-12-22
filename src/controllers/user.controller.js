// export {
//     registerUser,                DONE
//     loginUser,                   DONE
//     logoutUser,                  DONE
//     refreshAccessToken,          DONE
//     changeCurrentPassword,       DONE
//     getCurrentUser,              DONE
//     updateAccountDetails,        DONE
//     updateUserAvatar,            DONE
//     updateUserCoverImage,        DONE
//     getUserChannelProfile,       DONE
//     getWatchHistory              DONE
// }

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js"
import jwt from "jsonwebtoken"
import { pipeline, pipeline, pipeline, pipeline } from "stream";
import mongoose from "mongoose";
import bcrypt from "bcrypt"

async function generateAccessAndRefreshTokens(user) {
    // console.log(user);

    const accessToken = await user.generateAccessToken(user)
    const refreshToken = await user.generateRefreshToken(user)
    return { accessToken, refreshToken }
}

const registerUSer = asyncHandler(async (req, res, next) => {
    // res.status(200).json({message:"Ok niqqa"})
    // get details from front end
    // if any data fields are missing, throw error, return
    // handle avatar file upload, make sure it is on cloudinary
    // check for existing user in db
    // instantiate the user using User schema
    // save user on db, then send success/failure response of save process

    const { username, email, fullName, password } = req.body;

    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(409, "All fields are mandatory")
    }

    const existingUser = await User.findOne({
        $or: [{ email }, { username }]
    })
    if (existingUser) {
        throw new ApiError(400, "Email or username already in use")
    }

    const localAvatarFilePath = req.files?.avatar[0]?.path;

    if (!localAvatarFilePath) throw new ApiError(400, "You must upload an avatar")

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    const avatar = await uploadOnCloudinary(localAvatarFilePath);
    const cvrImg = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) throw new ApiError(400, "Avatar file is required")

    const user = await User.create({
        username,
        email,
        fullName,
        password,
        avatar: avatar.url,
        cvrImg: cvrImg?.url || ""
    })

    const userWithoutPasswordAndToken = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!userWithoutPasswordAndToken) throw new ApiError(500, "Something went wrong while registering on database")

    return res.status(201).json(
        new ApiResponse(200, userWithoutPasswordAndToken, "User registered succesfully")
    )
})


const loginUser = asyncHandler(
    async (req, res, next) => {
        // get user data from the frontend and unpack it
        // if invalid data, send back error, return
        // try to find user by username or email in the db
        // if the user is not found, return by showing error message "not found"
        // if suer is found, match password
        // finally generate access and refresh tokens
        // return the user info after removing the password and refresh tokens from the payload

        const { username, email, password } = req.body

        if (!username && !email) throw new ApiError(403, "Please provide a username or email")
        if (!password) {
            throw new ApiError(400, "Password is required")
        }
        const user = await User.findOne({
            $or: [{ email }, { username }]
        })

        if (!user) throw new ApiError(400, "No user with given email or username is found")

        // const userPassword = user.password
        const PasswordCorrect = await user.isPasswordCorrect(password)
        if (!PasswordCorrect) throw new ApiError(409, "Incorrect password, try again")

        const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(user)
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        console.log("After save - refreshToken in DB:", user.refreshToken)

        const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

        const options = {
            httpOnly: true,
            secure: true
        }
        // console.log(req.cookies.accessToken);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        user: loggedInUser, accessToken, refreshToken
                    },
                    "User logged In Successfully"
                )
            )

    })


const logOutUser = asyncHandler(
    async (req, res, next) => {
        await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    refreshToken: undefined
                }
            },
            {
                new: true
            }
        )

        const options = {
            httpOnly: true,
            secure: true
        }

        return res.status(200)
            .clearCookie("accessToken")
            .clearCookie("refreshToken")
            .json(
                new ApiResponse(200, {}, "User logged out succesfully")
            )
    }
)


const refreshAccessToken = asyncHandler(
    async (req, res, _) => {
        const incomingRefreshToken = req.cookies.refreshToken || req.header("Authorization").replace("Bearer ", "")
        if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request")
        try {
            const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
            if (!decodedToken) throw new ApiError(401, "Invalid refresh token")
            const user = await User.findById(decodedToken?._id)
            if (!user) throw new ApiError(401, "user not found")
            const storedRefreshToken = user.refreshToken
            console.log(user);

            console.log(incomingRefreshToken);
            console.log(storedRefreshToken);
            console.log(incomingRefreshToken === storedRefreshToken);



            if (incomingRefreshToken !== storedRefreshToken) throw new ApiError(401, "Refresh token is expired or used")

            const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user)
            // console.log(newRefreshToken);

            user.refreshToken = refreshToken
            user.accessToken = accessToken
            console.log(user.refreshToken);

            // console.table(newAccessToken, newRefreshToken)
            await user.save({ validateBeforeSave: false })
            const options = {
                httpOnly: true,
                secure: true
            }
            // const userWithoutPasswordAndRefreshToen = await User.findById(user._id).select(
            //     "-password -refreshToken"
            // )
            return res.status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", refreshToken, options)
                .json(
                    new ApiResponse(
                        200,
                        { accessToken, refreshToken },
                        "Refresh token refreshed successfully"
                    )
                )
        } catch (error) {
            throw new ApiError(401, error?.message || "Something went wrong while refreshing access token")
        }
    }
)


const getUserSubscribersAndSubscribedTo = asyncHandler(
    async (req, res, _) => {
        const usernameOfProfileWeAreViewing = req.params
        if (!usernameOfProfileWeAreViewing) throw new ApiError(400, "No profile name found")


        const pipeline = [
            {
                $match: {
                    username: usernameOfProfileWeAreViewing     // change this to the username obtained from the req
                }
            },
            {
                $lookup: {          // get the number of subscribers of user
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },
            {
                $lookup: {          // get the number of channels the user is subscribed to
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedToCount"
                }

            },
            {
                $addFields: {
                    subscribersCount: {
                        $size: "$subscribers"
                    },
                    subscribedToCount: {
                        $size: "$subscribedToCount"
                    },
                    isSubscribed: {
                        $cond: {
                            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: {
                    username: 1,
                    subscribersCount: 1,
                    subscribedToCount: 1,
                    isSubscribed: 1
                }
            }
        ]

        if (!pipeline?.length) throw new ApiError(409, "channel does not exist")

        const results = User.aggregate(pipeline)   // this contains the subscribers and subscribed to count

        res.status(200)
            .json(
                new ApiResponse(200, results[0], "Channel data fetched succesfully")
            )

    }

)


const getWatchHistory = asyncHandler(
    async (req, res, _) => {
        const userId = req.user?._id
        if (!userId) throw new ApiError(400, "User not found")

        // we already have an array `watchHistory` which is populated with video ids beforehanded, we just have to do a succesfull lookup on every videoId of this array and project a full document for each videoId 
        const pipeline = [
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(userId)        // if we dont do this, we end up searching for a string type id, whereas we have saved it as ObjectId(_id)
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory"
                },
                // this sub-pipeline returns sanitised doc of every owner of corresponding video id
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        fullName: 1,
                                        avatar: 1,
                                        coverImage: 1,
                                        _id: 1
                                    }
                                }
                            ]
                        },
                        // now sanitise the above owner, only include the necessary fields
                        // $project: {
                        //     username: 1,
                        //     fullName: 1,
                        //     avatar: 1,
                        //     coverImage: 1,
                        //     _id: 1
                        // }
                    },
                    // now we have clean doc of every owner, only take the first element of every owner result, WHY? I DONT KNOW
                    {
                        $addFields: {
                            owner: {
                                $first: { $owner }
                            }
                        }
                    }
                ]
            }
        ]

        if (!pipeline) throw new ApiError(401, "Failed to fetch watch history")

        const watchHistory = User.aggregate(pipeline)

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    watchHistory[0].watchHistory, // WHY?
                    "Watch History fetched succesfully"
                )
            )
    }
)


const updateUserAvatar = asyncHandler(
    async (req, res, _, _) => {
        // get the localAvatarFilePath from  req.files?.avatar[0]?.path;
        // if you do not find localAvatarFilePath, return as it is mandatory
        // upload this new file on cloudinary and get the url
        // change old avatar url pf user and save

        const localAvatarFilePath = req.files?.avatar[0]?.path;
        if (!localAvatarFilePath) throw new ApiError(408, "Avatar image is mandatory, it cannot be empty")

        const cloudinaryUrl = await uploadOnCloudinary(localAvatarFilePath)

        if (!cloudinaryUrl) throw new ApiError(200, "upload failed on cloudinary")

        const id = req.user?._id

        if (!id) throw new ApiError(409, "User not found")

        await User.findOneAndUpdate(
            {
                id
            },
            {
                $set: {
                    avatar: cloudinaryUrl
                }
            },
        )

        return res
            .status(200)
            .json(
                new ApiResponse(200, {}, "Avatar updated succesfully")
            )
    }
)


const updateUserCoverImage = asyncHandler(
    async (req, res, _, _) => {
        // get the localAvatarFilePath from  req.files?.avatar[0]?.path;
        // if you do not find localAvatarFilePath, return as it is mandatory
        // upload this new file on cloudinary and get the url
        // change old avatar url pf user and save

        let coverImageLocalPath;
        if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
            coverImageLocalPath = req.files.coverImage[0].path
        }

        const cloudinaryUrl = await uploadOnCloudinary(coverImageLocalPath)

        if (!cloudinaryUrl) throw new ApiError(200, "upload failed on cloudinary")

        const id = req.user?._id

        if (!id) throw new ApiError(409, "User not found")

        await User.findOneAndUpdate(
            {
                id
            },
            {
                $set: {
                    cvrImg: cloudinaryUrl || ""
                }
            },
        )

        return res
            .status(200)
            .json(
                new ApiResponse(200, {}, "Cover image updated succesfully")
            )
    }
)


const updateAccountDetails = asyncHandler(
    async (req, res, _, _) => {
        // get : username , fullname , email , password FROM: req body
        // (avatar and coverImage handled by multer)
        // return if any of the fields is empty
        // update all user details
        // save the document
        // return success message with new user details as res

        const userId = req.user?._id
        if (!userId) throw new ApiError(409, "User is not logged in because we did not find an associated user id")

        const { username: newUsernname, fullname: newFullname, email: newEmail, password: newPassword } = req.body

        if ([newUsernname, newFullname, newEmail, newPassword].some((field) => field?.trim() === "")) throw new ApiError(409, "All fields are manadatory")

        const localAvatarFilePath = req.files?.avatar[0]?.path;

        if (!localAvatarFilePath) throw new ApiError(400, "You must upload an avatar")

        let coverImageLocalPath;
        if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
            coverImageLocalPath = req.files.coverImage[0].path
        }
        const avatar = await uploadOnCloudinary(localAvatarFilePath);
        const cvrImg = await uploadOnCloudinary(coverImageLocalPath)

        const hashedPassword = await bcrypt.hash(newPassword, 10)
        const updatedUser = await User.findByIdAndUpdate(userId, {
            username: newUsernname,
            email: newEmail,
            fullName: newFullname,
            password: hashedPassword,
            avatar: avatar.url,
            cvrImg: cvrImg?.url || ""
        },
            {
                new: true
            }
        ).select(
            "-password -refreshToken"
        )

        return res
            .status(200)
            .json(
                new ApiResponse(200, updatedUser, "User details updated succesfully")
            )
    }
)


const getCurrentUser = asyncHandler(
    async (req, res, _, _) => {
        const currUserId = req.user?._id

        if (!currUserId) throw new ApiError(400, "Please login before accessing your account")
        const username = req.user?.username
        const user = await User.findOne({
            $or: [{ currUserId }, { username }]
        }).select(
            "-password -refreshToken"
        )

        if (!user) throw new ApiError(409, "User not found")

        return res
            .status(200)
            .json(
                new ApiResponse(200, user, "Current user fetched succesfully")
            )
    }
)


const changeCurrentPassword = asyncHandler(
    async (req, res, _, _) => {
        const { newPassword } = req.body
        if (!newPassword) throw new ApiError(408, "A new password is required")
        const userId = req.user?._id;
        if (!userId) throw new ApiError(409, "User has to be authenitcated to change current password")

        // const hashedPassword = await bcrypt.hash(newPassword , 10)
        const user = await User.findOne(userId)
        user.password = hashedPassword
        await user.save({ validateBeforeSave: false })

        return res
            .status(200)
            .json(
                new ApiResponse(200, {}, "Password changed succesfully")
            )

    }
)


export {
    registerUSer,
    loginUser,
    logOutUser,
    refreshAccessToken,
    getUserSubscribersAndSubscribedTo,
    getWatchHistory,
    changeCurrentPassword,
    getCurrentUser,
    updateUserAvatar,
    updateAccountDetails,
    updateUserCoverImage
}