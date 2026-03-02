## Stub pipeline (Step Functions)

This folder contains infrastructure files for the PitchMirror 2.0 **stub pipeline** implemented as an AWS Step Functions **Standard** state machine.

### State machine

- Definition: `infra/state-machines/pitchmirror2_stub_pipeline.asl.json`
- Name: `pitchmirror2-stub-pipeline`
- Type: Standard
- Execution name: `jobId` (set by the backend when calling `StartExecution`)

The state machine:

- Conditionally marks a job as **RUNNING** (only if `stage == "VALIDATE"`).
- Waits 2 seconds.
- Builds a stub `report` object.
- Writes `report.json` into the derived S3 bucket.
- Conditionally marks the job as **SUCCEEDED** / `FINALIZE`.
- On any non-conditional failure, marks the job as **FAILED** with `errorCode` / `errorMessage`.
- Treats DynamoDB `ConditionalCheckFailedException` as a **no-op success** (job already advanced).

### IAM role JSON

- Trust policy: `infra/iam/stepfunctions_execution_role_trust.json`
- Permissions: `infra/iam/stepfunctions_execution_role_policy.json`

You must create an IAM role (for example, `pitchmirror2-stub-pipeline-execution`) with:

- Trust: `states.amazonaws.com`
- Policy:
  - `dynamodb:UpdateItem` on `arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/pitchmirror2-jobs`
  - `s3:PutObject` on `arn:aws:s3:::pitchmirror2-derived-omer-2026/derived/*`

Replace `ACCOUNT_ID` with your AWS account ID when attaching the policy.

### Deploying the stub pipeline

From the repo root:

```bash
export AWS_REGION=us-east-1
export ACCOUNT_ID=<your_aws_account_id>
export SFN_ROLE_ARN=arn:aws:iam::<your_aws_account_id>:role/pitchmirror2-stub-pipeline-execution

bash infra/deploy/deploy_stub_pipeline.sh
```

The script will:

- Create or update the `pitchmirror2-stub-pipeline` state machine.
- Use the ASL definition from `infra/state-machines/pitchmirror2_stub_pipeline.asl.json`.
- Write the state machine ARN to `infra/deploy/outputs.json`.

### Verifying in AWS Console

1. **Step Functions**
   - Go to Step Functions in `us-east-1`.
   - Open the `pitchmirror2-stub-pipeline` state machine.
   - Start executions (or let the backend start them after `/finalize`) and verify:
     - `MarkRunning` runs only when the job is in `stage == "VALIDATE"`.
     - Conditional check failures go to `NoOpSuccess` (END) without marking the job FAILED.
     - Successful runs go through `Wait2s` → `BuildReport` → `PutStubReport` → `MarkSucceeded`.

2. **S3 (derived bucket)**
   - Bucket: `pitchmirror2-derived-omer-2026`
   - Object key: `derived/<jobId>/report.json`
   - Confirm the object exists and contains the stub JSON report.

3. **DynamoDB (`pitchmirror2-jobs`)**
   - Locate the item for the `jobId` you executed.
   - Verify state transitions:
     - While the pipeline is in progress: `status = RUNNING`, `stage = VALIDATE`.
     - On success: `status = SUCCEEDED`, `stage = FINALIZE`, `reportKey = derived/<jobId>/report.json`.
     - On non-conditional failure: `status = FAILED`, `errorCode` and `errorMessage` populated.

