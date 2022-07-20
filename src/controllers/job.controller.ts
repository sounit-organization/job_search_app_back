import { NextFunction, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { CustomError } from "../middleware/defaultErrorHandler";
import Job, { CreateJobPostData } from "../models/job";
import DatabaseService from "../services/database.service";
import { jobService } from "../services/job.service";
import { validateJob } from "../validators/job.validator";

export const getJobs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { skip, limit } = req.query;

    const pipeLine = [
      {
        $lookup: {
          // join table name = skills collection
          from: "skills",
          // local field = jobs.skills
          localField: "skills",
          // foreignField = skills._id
          foreignField: "_id",
          // as is necessary for lookup, overwrite if same field name
          as: "skills",
        },
      },
    ];

    const jobs = (await DatabaseService.getInstance()
      .collections.jobs?.aggregate(pipeLine)
      .skip(Number(skip))
      .limit(Number(limit))
      .toArray()) as Job[];

    const count =
      await DatabaseService.getInstance().collections.jobs?.countDocuments();

    res.json({ jobs, count });
  } catch (error) {
    (error as CustomError).statusCode = 500;
    next(error);
  }
};

export const getJobById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const jobId = req.params.jobId;
    const job = await jobService.getJobById(jobId);

    res.json({ job });
  } catch (error) {
    (error as CustomError).statusCode = 404;
    next(error);
  }
};

export const searchJobs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // FIXME: add type
    const { title, skip, limit } = req.query;
    const regExp = new RegExp(`${title}`, "i");

    const pipeline = [
      { $match: { title: regExp } },
      {
        $lookup: {
          from: "skills",
          localField: "skills",
          foreignField: "_id",
          as: "skills",
        },
      },
    ];

    const jobsCollection = DatabaseService.getInstance().collections.jobs;

    const searchedJobs = (await jobsCollection
      ?.aggregate(pipeline)
      .skip(Number(skip))
      .limit(Number(limit))
      .toArray()) as Job[];

    const count = await jobsCollection?.countDocuments({ title: regExp });

    res.json({ searchedJobs, count });
  } catch (error) {
    (error as CustomError).statusCode = 500;
    next(error);
  }
};

export const createJob = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).userId as string;
    const createJobPostData = req.body as CreateJobPostData;

    // validation
    const { error } = validateJob({ ...createJobPostData, userId });
    if (error) {
      return next(error);
    }

    const skills = createJobPostData.skills.map((skill) => new ObjectId(skill));
    const newJob = { ...createJobPostData, skills, userId } as Job;

    const result =
      await DatabaseService.getInstance().collections.jobs?.insertOne(newJob);

    if (!result) {
      const error = new Error("Failed to create a new job.");
      (error as CustomError).statusCode = 500;
      return next(error);
    }

    res.status(201).json({
      _id: result.insertedId,
      ...newJob,
    });
  } catch (error) {
    (error as CustomError).statusCode = 400;
    next(error);
  }
};

export const updateJob = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const updatedJob = req.body as Job;
    const { jobId } = req.params;
    const userId = (req as any).userId;

    const { error } = validateJob({ ...updatedJob, userId });
    if (error) {
      return next(error);
    }

    const result =
      await DatabaseService.getInstance().collections.jobs?.updateOne(
        {
          _id: new ObjectId(jobId),
          userId,
        },
        { $set: updatedJob }
      );

    if (!result) {
      const error = new Error("Failed to update job.");
      (error as CustomError).statusCode = 500;
      return next(error);
    }

    if (result?.matchedCount === 0) {
      return res
        .status(500)
        .json({ message: "Failed to update job. No match job found!" });
    }

    res.json({ _id: jobId, ...updatedJob });
  } catch (error) {
    (error as CustomError).statusCode = 400;
    next(error);
  }
};

export const deleteJob = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { jobId } = req.params;
    const userId = (req as any).userId;

    const result =
      await DatabaseService.getInstance().collections.jobs?.deleteOne({
        _id: new ObjectId(jobId),
        userId,
      });

    console.log(result);

    if (!result) {
      const error = new Error("Failed to delete job.");
      (error as CustomError).statusCode = 500;
      return next(error);
    }

    if (result?.deletedCount === 0) {
      return res
        .status(500)
        .json({ message: "Failed to delete job. No match job found!" });
    }

    res.json({ _id: jobId });
  } catch (error) {
    (error as CustomError).statusCode = 400;
    next(error);
  }
};
