#!/usr/bin/env bash

set -euo pipefail

STATE_MACHINE_NAME="pitchmirror2-stub-pipeline"
ASL_PATH="infra/state-machines/pitchmirror2_stub_pipeline.asl.json"
OUTPUTS_PATH="infra/deploy/outputs.json"

if [[ -z "${AWS_REGION:-}" ]]; then
  echo "AWS_REGION must be set (expected us-east-1)." >&2
  exit 1
fi

if [[ -z "${ACCOUNT_ID:-}" ]]; then
  echo "ACCOUNT_ID must be set (your AWS account ID)." >&2
  exit 1
fi

if [[ -z "${SFN_ROLE_ARN:-}" ]]; then
  echo "SFN_ROLE_ARN must be set (IAM role for Step Functions execution)." >&2
  exit 1
fi

if [[ ! -f "${ASL_PATH}" ]]; then
  echo "State machine definition not found at ${ASL_PATH}" >&2
  exit 1
fi

STATE_MACHINE_ARN="arn:aws:states:${AWS_REGION}:${ACCOUNT_ID}:stateMachine:${STATE_MACHINE_NAME}"

echo "Using state machine ARN: ${STATE_MACHINE_ARN}"

if aws stepfunctions describe-state-machine --state-machine-arn "${STATE_MACHINE_ARN}" >/dev/null 2>&1; then
  echo "Updating existing state machine ${STATE_MACHINE_NAME}..."
  aws stepfunctions update-state-machine \
    --state-machine-arn "${STATE_MACHINE_ARN}" \
    --definition "file://${ASL_PATH}" \
    --role-arn "${SFN_ROLE_ARN}" >/dev/null
else
  echo "Creating new state machine ${STATE_MACHINE_NAME}..."
  aws stepfunctions create-state-machine \
    --name "${STATE_MACHINE_NAME}" \
    --definition "file://${ASL_PATH}" \
    --role-arn "${SFN_ROLE_ARN}" \
    --type STANDARD >/dev/null
fi

mkdir -p "$(dirname "${OUTPUTS_PATH}")"
cat > "${OUTPUTS_PATH}" <<EOF
{
  "stubPipelineStateMachineArn": "${STATE_MACHINE_ARN}"
}
EOF

echo "Deployed Step Functions state machine:"
echo "  Name: ${STATE_MACHINE_NAME}"
echo "  ARN:  ${STATE_MACHINE_ARN}"
echo "Outputs written to ${OUTPUTS_PATH}"

