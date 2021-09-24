FROM nginx:alpine

ARG cnb_uid=1001
ARG cnb_gid=1001

# Set required CNB information
ARG stack_id
LABEL io.buildpacks.stack.id="${stack_id}"

ADD ./default.conf /etc/nginx/conf.d/default.conf
ADD ./nginx.conf /etc/nginx/nginx.conf

# Set user and group (as declared in base image)
#USER ${cnb_uid}:${cnb_gid}
