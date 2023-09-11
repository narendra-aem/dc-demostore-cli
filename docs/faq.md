#FAQ

## Internal server error on cleanup

This `dc-demostore-cli` project does not take into account rate limits and runs as fast is it can. As such you may get a rate limit hit from the Amplience management API's which this CLI does not have code to handle.

Simply run your cleanup again and the issue should be resolved.

