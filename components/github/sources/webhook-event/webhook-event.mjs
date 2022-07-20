import common from "../common/common-webhook.mjs";
import constants from "../common/constants.mjs";

export default {
  ...common,
  key: "github-weebhook-vents",
  name: "New Webhook Event (Instant)",
  description: "Emit new event for each selected event types",
  type: "source",
  version: "0.0.18",
  dedupe: "unique",
  props: {
    ...common.props,
    events: {
      label: "Webhook Events",
      description: "The event will be emitted",
      type: "string[]",
      options: constants.REPOSITORY_WEBHOOK_EVENTS.map(({
        value, label,
      }) => ({
        value,
        label,
      })),
      reloadProps: true,
    },
  },
  async additionalProps() {
    const props = {};
    if (constants.PACKAGE_TYPE_PROPS.includes(this.events[0])) {
      props.packageType = {
        label: "Package type",
        description: "The type of supported package",
        type: "string",
        options: constants.PACKAGE_TYPE,
      };
    }
    if (constants.ORG_NAME_PROPS.includes(this.events[0])) {
      props.orgName = {
        label: "Organization",
        description: "Organization name",
        type: "string",
        options: async () => {
          const organizations = await this.github.getOrganizations();
          return organizations.map((organization) => organization.login);
        },
      };
    }
    if (constants.TEAM_PROPS.includes(this.events[0])) {
      props.teamSlug = {
        label: "Teams",
        description: "Lists all teams in an organization that are visible to the authenticated user",
        type: "string",
        options: async () => {
          const teams = await this.github.getTeams();
          return teams.map((team) => ({
            label: team.name,
            value: team.slug,
          }));
        },
      };
    }
    if (constants.COMMIT_PROPS.includes(this.events[0])) {
      props.commit = {
        label: "Commit ID",
        description: "Commit ID",
        type: "string",
        options: async () => {
          const commits = await this.github.getCommits({
            repoFullname: this.repoFullname,
          });
          return commits.map((commit) => ({
            label: commit.commit.message,
            value: commit.sha,
          }));
        },
      };
    }

    return props;
  },
  methods: {
    ...common.methods,
    getWebhookEvents() {
      return this.events;
    },
    async loadHistoricalData() {
      const func = constants
        .REPOSITORY_WEBHOOK_EVENTS
        .find((item) => this.events[0] === item.value);
      if (func?.fnName) {
        const data = await this["github"][func.fnName]({
          repoFullname: this.repoFullname,
          orgName: this.orgName,
          teamSlug: this.teamSlug,
          commitId: this.commit,
          data: {
            per_page: 25,
            page: 1,
            package_type: this.packageType,
          },
        });
        console.log("data", data);
        const ts = new Date().getTime();
        if (data) {
          return data.map((event) => ({
            main: event,
            sub: {
              id: event?.id || event?.name || ts,
              summary: `New event of type ${constants.REPOSITORY_WEBHOOK_EVENTS.find((item) => this.events[0] === item.value).label}`,
              ts,
            },
          }));
        }
      }

    },
  },
  async run(event) {
    const {
      headers,
      body,
    } = event;

    this.$emit(body, {
      id: headers["x-github-delivery"],
      summary: `New event ${headers["x-github-hook-installation-target-id"]} of type ${headers["x-github-hook-installation-target-type"]}}`,
      ts: new Date(),
    });
  },
};
