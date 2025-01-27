# Commands

The `and-cli` is built upon our team's best practices for setting up projects.

## deploy

Collection of deployment sub-commands to manage a variety of application types.

### AWS Beanstalk Usage

System requirements:
- [Python 3.7+](https://www.python.org/ftp/python/3.7.4/python-3.7.4-amd64.exe)
    - Ensure configured in your PATH
- Configure AWS IAM User account
    - Log into AWS console
    - Click Username dropdown > My Security Credentials > Users
    - Click `Add User`
        - Add User name `nfpa-{environment}` (ie. nfpa-working)
        - Select `Programmatic Access` and `AWS Management Console access`
    - Click `Next: Permissions
    - Click `Attach existing policies directly`
        - `AWSElasticBeanstalkFullAccess`

Project requirements:
- Add new AWS EB profile to your `~/.aws/config` file
    ```
    [profile your-name]
    aws_access_key_id = YOUR_ACCESS_KEY_ID
    aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
    ```
- Perform initial EB setup in project repository in desired git branch
    - `$: eb init --profile {YOUR_PROFILE_NAME}`
    - Or for an existing application update your `.elasticbeanstalk/config` file
        ```
        global:
            profile: {YOUR_PROFILE_NAME}
        ```
- Setup AWS beanstalk manifest
    - dotnet
        - Create `dotnet/aws-windows-deployment-manifest.json`. Example...
            ```json
            {
                "manifestVersion": 1,
                "deployments": {
                    "aspNetCoreWeb": [
                        {
                            "name": "my-application",
                            "parameters": {
                                "appBundle": "release.zip",
                                "iisPath": "/",
                                "iisWebSite": "Default Web Site"
                            }
                        }
                    ]
                }
            }
            ```
- Configure application's entry point
    - dotnet
       - Configure a `web.config` with your aspnet core assembly
            ```xml
            <?xml version="1.0" encoding="utf-8"?>
                <configuration>
                <system.webServer>
                    <handlers>
                    <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModule" resourceType="Unspecified" />
                    </handlers>
                    <aspNetCore processPath="dotnet" arguments=".\Web.dll" stdoutLogEnabled="false" stdoutLogFile=".\logs\stdout" forwardWindowsAuthToken="false" />
                </system.webServer>
            </configuration>
            ```

##### Commands
* `and-cli deploy aws-beanstalk --dotnet` - Deploy dotnet core application to AWS beanstalk


## dotnet

### Usage

While the sdk will _eventually_ locate your solution file `.sln`. Placing your solution file in one of the following locations is recommended for the
best performance.

1. Root `*.sln`
2. Child of dotnet folder `dotnet/*.sln`
3. Grandchild of dotnet folder `dotnet/*/*.sln`
4. Anywhere else `**/*.sln`

### Commands

* `and-cli dotnet` - Runs the dotnet solution's web project
    * `and-cli dotnet -b, --build` - Builds the solution
    * `and-cli dotnet -c, --clean` - Cleans the solution
    * `and-cli dotnet -- --cli my command` - Runs commands through a project's custom dotnet cli project
    * `and-cli dotnet -R, --restore` - Restores NuGet packages for the solution
    * `and-cli dotnet -r, --run` - Runs the dotnet solution's web project (default)
    * `and-cli dotnet -w, --watch` - Runs the solution and reloads on changes
* `and-cli dotnet-test` - Run automated tests for the solution
    * `and-cli dotnet-test --filter <filter>` - Runs automated tests that match the provided filter text

---

## install

The `and-cli` itself requires some minor setup and these commands hopefully ease that lift.

### Commands

* `and-cli install` - Configures global npm package, project-specific `and-cli` alias and the developer `and-cli-dev` alias

---

## migration

This command wraps the functionality provided by the dotnet ef tool for common Entity Framework interactions, such as creating a new migration, applying the migration, or deleting an existing migration.

### Commands

* `and-cli migration --add <migration name>` - Creates a new entity framework migration based on changes from the last context snapshot.
* `and-cli migration --run <migration name>` - Applies (or reverts) an entity framework migration based on the current database.
* `and-cli migration --delete` - Removes files for the most recent migration, which cannot be applied to the database. If already applied, you need to revert to a previous migration first.

## nuget

While the dotnet core cli provides some nuget commands, the process start to finish is less than ideal. These commands aim to make that simple.

### Commands

* `and-cli nuget --publish <version>` - Updates, packs and publishes dotnet core 'packable' projects to NuGet
